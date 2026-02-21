const fastify = require('fastify')({ logger: true });
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// ... (db setup remains same)

// Setup DB
const dataFolder = process.env.RENDER ? '/opt/render/project/src/backend/data' : __dirname;
const dbPath = path.join(dataFolder, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper for Async SQLite
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

// Initialize Schema
const schemaInit = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schemaInit);

// CORS
// CORS - Allow all origins for extension compatibility
fastify.register(require('@fastify/cors'), {
    origin: '*', // Allow all origins explicitly for extension access
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// Routes
fastify.get('/', async (request, reply) => {
    return { status: 'ok', message: 'LinkedIn Intern Helper Backend Running' };
});

fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

fastify.get('/profile', async (request, reply) => {
    const user = await dbGet('SELECT * FROM users LIMIT 1');
    return user || {};
});

fastify.post('/profile', async (request, reply) => {
    const {
        full_name, email, phone, location, linkedin_url, portfolio_url,
        work_auth, relocation, notice_period, expected_stipend, common_answers
    } = request.body;

    // Upsert user (Single user system for MVP)
    const existing = await dbGet('SELECT id FROM users LIMIT 1');
    if (existing) {
        await dbRun(`UPDATE users SET 
            full_name=?, email=?, phone=?, location=?, linkedin_url=?, portfolio_url=?, 
            work_auth=?, relocation=?, notice_period=?, expected_stipend=?, common_answers=? 
            WHERE id=?`,
            [full_name, email, phone, location, linkedin_url, portfolio_url,
                work_auth, relocation, notice_period, expected_stipend,
                JSON.stringify(common_answers || {}), existing.id]);
    } else {
        await dbRun(`INSERT INTO users (
            full_name, email, phone, location, linkedin_url, portfolio_url, 
            work_auth, relocation, notice_period, expected_stipend, common_answers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, phone, location, linkedin_url, portfolio_url,
                work_auth, relocation, notice_period, expected_stipend,
                JSON.stringify(common_answers || {})]);
    }
    return { success: true };
});

fastify.get('/applications', async (request, reply) => {
    const apps = await dbAll('SELECT * FROM applications ORDER BY applied_at DESC');
    return apps;
});

fastify.post('/applications/track', async (request, reply) => {
    const { job_id, company, title, location, status } = request.body;
    try {
        await dbRun('INSERT INTO applications (job_id, company, title, location, status) VALUES (?, ?, ?, ?, ?)',
            [job_id, company, title, location, status || 'APPLIED']);
        return { success: true };
    } catch (err) {
        return { success: false, error: 'Already tracked or error: ' + err.message };
    }
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
