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
    const {
        full_name, phone, location, linkedin_url, portfolio_url, experience
    } = request.body;

    const first_name = full_name ? full_name.split(' ')[0] : '';
    const last_name = full_name ? full_name.split(' ').slice(1).join(' ') : '';

    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('profiles')
            .update({
                first_name, last_name, phone, city: location, linkedin_url, portfolio_url, experience: experience || '', updated_at: new Date()
            })
            .eq('id', existing.id);

        if (error) fastify.log.error(error);
    } else {
        const { error } = await supabase
            .from('profiles')
            .insert([{
                user_id: 'default-user',
                first_name, last_name, phone, city: location, linkedin_url, portfolio_url, experience: experience || '', updated_at: new Date()
            }]);

        if (error) fastify.log.error(error);
    }
    return { success: true };
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
