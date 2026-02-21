const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const seed = () => {
    db.serialize(() => {
        // Insert Test User
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO users (id, full_name, email, phone, linkedin_url) 
            VALUES (1, 'Test User', 'test.user@example.com', '1234567890', 'https://linkedin.com/in/testuser')
        `);
        stmt.run();
        stmt.finalize();

        console.log("Database seeded with test user.");

        // Check data
        db.each("SELECT * FROM users", (err, row) => {
            console.log("User in DB:", row);
        });
    });
    db.close();
};

seed();
