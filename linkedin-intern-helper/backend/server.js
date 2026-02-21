const fastify = require('fastify')({ logger: true });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env");
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// CORS - Allow all origins for extension compatibility
fastify.register(require('@fastify/cors'), {
    origin: '*', // Allow all origins explicitly for extension access
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// Routes
fastify.get('/', async (request, reply) => {
    return { status: 'ok', message: 'LinkedIn Intern Helper Backend Running (Supabase)' };
});

fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

fastify.get('/profile', async (request, reply) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
        fastify.log.error(error);
    }
    return data || {};
});

fastify.post('/profile', async (request, reply) => {
    const payload = request.body;

    // Destructure all possible fields requested by the frontend
    const {
        user_id, full_name, email, phone, location, linkedin_url, portfolio_url, experience,
        degree, major, university, graduation_year, year_of_study, current_year, gpa,
        authorized_to_work, open_to_relocation, stipend, expected_stipend, availability_type,
        available_from, notice_period, skills, experience_summary,
        projects, resume_filename, metadata,
        internship_count, preferred_domain, availability_weeks,
        resume_base64, resume_content_type
    } = payload;

    const safeUserId = user_id || 'default-user';
    const first_name = full_name ? full_name.split(' ')[0] : '';
    const last_name = full_name ? full_name.split(' ').slice(1).join(' ') : '';

    // Helper to safely parse strings like "$60/hr" to integers
    const parseSafeInt = (val) => {
        if (val === undefined || val === null || val === '') return null;
        const parsed = parseInt(String(val).replace(/\D/g, ''), 10);
        return isNaN(parsed) ? null : parsed;
    };

    // Process Resume Upload to Supabase Storage if present
    let final_resume_url = null;
    let final_resume_name = resume_filename || null;

    if (resume_base64) {
        try {
            // Strip out data URI scheme if present e.g., "data:application/pdf;base64,"
            const base64Data = resume_base64.replace(/^data:.*?;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const safeName = (resume_filename || 'resume.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');
            const bucketPath = `${safeUserId}/${Date.now()}_${safeName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(bucketPath, buffer, {
                    contentType: resume_content_type || 'application/pdf',
                    upsert: true
                });

            if (uploadError) {
                fastify.log.error("SUPABASE STORAGE UPLOAD ERROR: " + JSON.stringify(uploadError));
            } else {
                const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(bucketPath);
                final_resume_url = publicUrlData.publicUrl;
                final_resume_name = safeName;
                fastify.log.info(`Resume successfully uploaded: ${final_resume_url}`);
            }
        } catch (err) {
            fastify.log.error("Resume processing error: " + err.message);
        }
    }

    const dbPayload = {
        user_id: safeUserId,
        full_name: full_name || '',
        first_name,
        last_name,
        email: email || '',
        phone: phone || '',
        city: location || '',
        linkedin_url: linkedin_url || '',
        portfolio_url: portfolio_url || '',

        experience: experience || experience_summary || '',
        experience_summary: experience_summary || experience || '',
        degree: degree || '',
        major: major || '',
        university: university || '',
        graduation_year: graduation_year || '',
        current_year: current_year || year_of_study || '',
        gpa: gpa || '',

        // Booleans
        authorized_to_work: authorized_to_work !== undefined ? !!authorized_to_work : true,
        open_to_relocation: open_to_relocation !== undefined ? !!open_to_relocation : false,

        // Integers mapped safely
        expected_stipend: parseSafeInt(expected_stipend || stipend),
        stipend: parseSafeInt(stipend || expected_stipend),
        year_of_study: parseSafeInt(year_of_study || current_year),
        internship_count: parseSafeInt(internship_count),
        availability_weeks: parseSafeInt(availability_weeks),

        // Strings
        availability_type: availability_type || '',
        available_from: available_from || '',
        notice_period: notice_period || '',
        skills: skills || '',
        preferred_domain: preferred_domain || '',

        projects: projects || [],
        metadata: metadata || {},
        updated_at: new Date()
    };

    if (final_resume_url) dbPayload.resume_url = final_resume_url;
    if (final_resume_name) dbPayload.resume_filename = final_resume_name;

    const { error } = await supabase
        .from('profiles')
        .upsert(dbPayload, { onConflict: 'user_id' });

    if (error) {
        fastify.log.error("SUPABASE UPSERT ERROR: " + JSON.stringify(error));
        console.error("SUPABASE UPSERT ERROR:", error);
        return reply.status(500).send({
            success: false,
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
    }

    return { success: true, message: "Profile saved successfully." };
});

fastify.get('/applications', async (request, reply) => {
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) fastify.log.error(error);
    return data || [];
});

fastify.post('/applications/track', async (request, reply) => {
    const { job_id, company, title, location, status } = request.body;

    // Auto map job_id to job_url, and title to job_title
    const { error } = await supabase
        .from('applications')
        .insert([{
            user_id: 'default-user',
            job_title: title,
            company,
            job_url: job_id,
            status: status || 'APPLIED'
        }]);

    if (error) {
        fastify.log.error(error);
        return { success: false, error: 'Already tracked or error: ' + error.message };
    }

    return { success: true };
});

// Start Server
const start = async () => {
    const PORT = process.env.PORT || 3000;
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server listening on ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
