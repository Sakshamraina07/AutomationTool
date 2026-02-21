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
        .from('users')
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
        full_name, email, phone, location, linkedin_url, portfolio_url,
        work_auth, relocation, notice_period, expected_stipend, common_answers
    } = request.body;

    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('users')
            .update({
                full_name, email, phone, location, linkedin_url, portfolio_url,
                work_auth, relocation, notice_period, expected_stipend,
                common_answers: common_answers || {}
            })
            .eq('id', existing.id);

        if (error) fastify.log.error(error);
    } else {
        const { error } = await supabase
            .from('users')
            .insert([{
                full_name, email, phone, location, linkedin_url, portfolio_url,
                work_auth, relocation, notice_period, expected_stipend,
                common_answers: common_answers || {}
            }]);

        if (error) fastify.log.error(error);
    }
    return { success: true };
});

fastify.get('/applications', async (request, reply) => {
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('applied_at', { ascending: false });

    if (error) fastify.log.error(error);
    return data || [];
});

fastify.post('/applications/track', async (request, reply) => {
    const { job_id, company, title, location, status } = request.body;

    const { error } = await supabase
        .from('applications')
        .insert([{
            job_id, company, title, location, status: status || 'APPLIED'
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
