import React, { useState, useEffect } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import { saveProfile as saveProfileService, getProfile } from './modules/profileService';

const DAILY_LIMIT = 10;

function AppContent() {

    const [backendStatus, setBackendStatus] = useState('Checking...');
    const [queue, setQueue] = useState([]);
    const [sessionStatus, setSessionStatus] = useState({
        isActive: false,
        isPaused: false,
        currentIndex: 0,
        dailyCount: 0
    });

    const [profile, setProfile] = useState({});
    const [resumeStatus, setResumeStatus] = useState(null);
    const [view, setView] = useState('session');

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3005';

    /* ---------------- INITIAL LOAD ---------------- */

    useEffect(() => {

        checkBackend();
        loadInitialData();

        const storageListener = (changes, area) => {
            if (area !== 'local') return;

            if (changes.jobQueue) {
                setQueue(changes.jobQueue.newValue || []);
            }

            if (changes.sessionState) {
                setSessionStatus(changes.sessionState.newValue || {});
            }

            if (changes.userProfile) {
                setProfile(changes.userProfile.newValue || {});
            }
        };

        chrome.storage.onChanged.addListener(storageListener);

        return () => {
            chrome.storage.onChanged.removeListener(storageListener);
        };

    }, []);

    /* ---------------- DATA LOADERS ---------------- */

    const loadInitialData = async () => {
        try {
            console.log("[InternHelper UI] Fetching Profile from Backend on mount...");
            const { profile, resume } = await getProfile();
            console.log("[InternHelper UI] Profile successfully loaded:", profile);
            setProfile(profile || {});

            if (resume) {
                setResumeStatus(`Saved: ${resume.name}`);
            }
        } catch (e) {
            console.error("[InternHelper UI] Error loading profile from backend:", e);
        }

        chrome.storage.local.get(
            ['jobQueue', 'sessionState'],
            (res) => {
                if (chrome.runtime.lastError) {
                    console.warn("Storage load error:", chrome.runtime.lastError);
                    return;
                }
                setQueue(res.jobQueue || []);
                setSessionStatus(res.sessionState || {});
            }
        );
    };

    const checkBackend = () => {

        chrome.runtime.sendMessage({ type: 'CHECK_BACKEND' }, (response) => {

            if (chrome.runtime.lastError) {
                setBackendStatus('Extension Error');
                return;
            }

            if (response?.success) {
                setBackendStatus('Connected');
            } else {
                setBackendStatus('Backend Offline');
            }
        });
    };

    /* ---------------- SESSION ACTIONS ---------------- */

    const sendMessage = (type) => {
        chrome.runtime.sendMessage({ type }, () => {
            if (chrome.runtime.lastError) {
                console.warn("Runtime error:", chrome.runtime.lastError);
            }
        });
    };

    const startSession = () => sendMessage('START_SESSION');
    const resumeSession = () => sendMessage('RESUME_SESSION');
    const stopSession = () => sendMessage('STOP_SESSION');

    const clearQueue = () => {
        if (confirm("Clear all jobs from queue?")) {
            chrome.storage.local.set({ jobQueue: [] });
        }
    };

    const removeJob = (id) => {
        const newQueue = queue.filter(job => job.jobId !== id);
        chrome.storage.local.set({ jobQueue: newQueue });
    };

    /* ---------------- PROFILE ---------------- */

    const saveProfile = async () => {

        try {

            const actualFile = profile._resumeFile instanceof Blob
                ? profile._resumeFile
                : null;

            const result = await saveProfileService(profile, actualFile);

            if (!result.success) {
                throw new Error(result.error);
            }

            const backendProfile = { ...profile };
            delete backendProfile._resumeFile;

            chrome.runtime.sendMessage({
                type: 'PROXY_REQ',
                endpoint: '/profile',
                method: 'POST',
                body: backendProfile
            });

            alert("Profile Saved Successfully!");
            if (actualFile) setResumeStatus("Uploaded");

        } catch (e) {
            alert("Error saving profile: " + e.message);
        }
    };

    const handleProfileChange = (e) => {

        const { name, value, type, files } = e.target;

        if (type === 'file') {
            if (files?.length) {
                setProfile(prev => ({ ...prev, [name]: files[0] }));
                setResumeStatus(`Selected: ${files[0].name}`);
            }
        } else {
            setProfile(prev => ({ ...prev, [name]: value }));
        }
    };

    /* ---------------- COMPUTED ---------------- */

    const dailyCount = sessionStatus?.dailyCount || 0;
    const isLimitReached = dailyCount >= DAILY_LIMIT;
    const pendingJobs =
        queue?.filter(j => !['DONE', 'FAILED', 'APPLIED'].includes(j.status)) || [];

    /* ---------------- UI ---------------- */

    return (
        <div className="popup-container">

            <header className="header">
                <h2>InternHelper</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setView('session')}
                        className={view === 'session' ? 'active-tab' : ''}
                    >
                        Session
                    </button>
                    <button
                        onClick={() => setView('profile')}
                        className={view === 'profile' ? 'active-tab' : ''}
                    >
                        Profile
                    </button>
                </div>
            </header>

            <div className="main-content">

                {view === 'session' ? (

                    <>
                        <div className="card control-panel">
                            <h3>Guided Session</h3>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <span className="status-badge">
                                    Today: {dailyCount}/{DAILY_LIMIT}
                                </span>
                                <div className={`status-badge ${backendStatus === 'Connected' ? 'online' : 'offline'}`}>
                                    {backendStatus}
                                </div>
                            </div>

                            <p className="subtitle">{pendingJobs.length} jobs pending</p>

                            {!sessionStatus?.isActive ? (
                                <button
                                    className="btn-primary"
                                    onClick={startSession}
                                    disabled={
                                        queue.length === 0 ||
                                        isLimitReached ||
                                        backendStatus !== 'Connected'
                                    }
                                >
                                    {isLimitReached
                                        ? 'Daily Limit Reached'
                                        : backendStatus !== 'Connected'
                                            ? 'BACKEND REQUIRED'
                                            : '▶ Start Guided Apply'}
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {sessionStatus?.isPaused && (
                                        <button
                                            className="btn-primary"
                                            onClick={resumeSession}
                                            style={{ backgroundColor: '#f59e0b' }}
                                        >
                                            Resume
                                        </button>
                                    )}
                                    <button className="btn-danger" onClick={stopSession}>
                                        Stop
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="card queue-list">
                            <div className="queue-header">
                                <h3>Apply Queue</h3>
                                <button className="btn-text" onClick={clearQueue}>
                                    Clear
                                </button>
                            </div>

                            {queue.length === 0 ? (
                                <p className="empty-state">
                                    No jobs in queue.<br />
                                    Go to LinkedIn and click "+ Queue".
                                </p>
                            ) : (
                                <ul className="job-list">
                                    {queue.map(job => (
                                        <li key={job.jobId} className={`job-item ${job.status?.toLowerCase()}`}>
                                            <div className="job-info">
                                                <a
                                                    href={job.jobUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="job-title"
                                                >
                                                    {job.title}
                                                </a>
                                                <span className="job-company">
                                                    {job.company}
                                                </span>
                                            </div>
                                            <div className="job-actions">
                                                {job.status === 'DONE' ? (
                                                    <span className="badge-applied">✓</span>
                                                ) : (
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => removeJob(job.jobId)}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                ) : (

                    <div className="card profile-form" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h3>Intern Profile</h3>

                        <input name="full_name" placeholder="Full Name"
                            value={profile.full_name || ''}
                            onChange={handleProfileChange} />

                        <input name="email" placeholder="Email"
                            value={profile.email || ''}
                            onChange={handleProfileChange} />

                        <input name="phone" placeholder="Phone"
                            value={profile.phone || ''}
                            onChange={handleProfileChange} />

                        <input name="linkedin_url" placeholder="LinkedIn URL"
                            value={profile.linkedin_url || ''}
                            onChange={handleProfileChange} />

                        <input name="portfolio_url" placeholder="Portfolio/Website URL"
                            value={profile.portfolio_url || ''}
                            onChange={handleProfileChange} />

                        <input name="university" placeholder="University"
                            value={profile.university || ''}
                            onChange={handleProfileChange} />

                        <input name="degree" placeholder="Degree (e.g., B.S., M.S.)"
                            value={profile.degree || ''}
                            onChange={handleProfileChange} />

                        <input name="major" placeholder="Major"
                            value={profile.major || ''}
                            onChange={handleProfileChange} />

                        <input name="gpa" placeholder="GPA"
                            value={profile.gpa || ''}
                            onChange={handleProfileChange} />

                        <input name="graduation_year" placeholder="Graduation Year"
                            value={profile.graduation_year || ''}
                            onChange={handleProfileChange} />

                        <input name="current_year" placeholder="Current Year (e.g. Junior, Senior)"
                            value={profile.current_year || ''}
                            onChange={handleProfileChange} />

                        <input name="experience_summary" placeholder="Years of Experience / Summary"
                            value={profile.experience_summary || ''}
                            onChange={handleProfileChange} />

                        <input name="skills" placeholder="Skills (comma separated)"
                            value={profile.skills || ''}
                            onChange={handleProfileChange} />

                        <input name="expected_stipend" placeholder="Expected Stipend"
                            value={profile.expected_stipend || ''}
                            onChange={handleProfileChange} />

                        <input name="notice_period" placeholder="Notice Period / Available From"
                            value={profile.notice_period || ''}
                            onChange={handleProfileChange} />

                        <input name="internship_count" placeholder="Prior Internship Count (e.g., 2)"
                            type="number"
                            value={profile.internship_count || ''}
                            onChange={handleProfileChange} />

                        <input name="preferred_domain" placeholder="Preferred Domain (e.g., Software Engineering)"
                            value={profile.preferred_domain || ''}
                            onChange={handleProfileChange} />

                        <input name="availability_weeks" placeholder="Availability Weeks (e.g., 12)"
                            type="number"
                            value={profile.availability_weeks || ''}
                            onChange={handleProfileChange} />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', margin: '8px 0' }}>
                            <input type="checkbox" name="authorized_to_work"
                                checked={profile.authorized_to_work !== false}
                                onChange={(e) => setProfile(prev => ({ ...prev, authorized_to_work: e.target.checked }))} />
                            Authorized to work in country
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', margin: '8px 0' }}>
                            <input type="checkbox" name="open_to_relocation"
                                checked={profile.open_to_relocation || false}
                                onChange={(e) => setProfile(prev => ({ ...prev, open_to_relocation: e.target.checked }))} />
                            Open to Relocation
                        </label>

                        <div style={{ marginTop: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#666' }}>Resume (PDF):</label>
                            <input type="file"
                                name="_resumeFile"
                                accept=".pdf"
                                onChange={handleProfileChange} />
                        </div>

                        {resumeStatus && (
                            <p style={{ color: '#10b981' }}>
                                ✓ {resumeStatus}
                            </p>
                        )}

                        <button
                            className="btn-primary"
                            onClick={saveProfile}
                        >
                            Save Profile
                        </button>
                    </div>
                )}

            </div>

            <footer className="footer">
                <button
                    className="btn-link"
                    onClick={() => window.open(`${API_URL}/applications`, '_blank')}
                >
                    View Dashboard ↗
                </button>
            </footer>

        </div>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}