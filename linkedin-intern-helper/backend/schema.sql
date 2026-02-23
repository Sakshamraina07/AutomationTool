CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    work_auth TEXT, -- "Authorized", "Sponsorship Required"
    relocation TEXT, -- "Yes", "No"
    notice_period TEXT, -- "Immediate", "15 Days", etc.
    expected_stipend TEXT,
    common_answers TEXT, -- JSON string of common screening answers
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    file_blob BLOB NOT NULL,
    tags TEXT, -- JSON array of tags
    is_active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT UNIQUE, -- LinkedIn Job ID
    company TEXT,
    title TEXT,
    location TEXT,
    status TEXT DEFAULT 'APPLIED', -- APPLIED, INTERVIEW, REJECTED, OFFER
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resume_used_id INTEGER,
    FOREIGN KEY(resume_used_id) REFERENCES resumes(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
