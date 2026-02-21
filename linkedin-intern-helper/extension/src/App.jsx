import React, { useState, useEffect } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import { saveProfile as saveProfileService } from './modules/profileService';

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

        chrome.storage.local.get(
            ['jobQueue', 'sessionState', 'userProfile', 'userResume'],
            (res) => {

                if (chrome.runtime.lastError) {
                    console.warn("Storage load error:", chrome.runtime.lastError);
                    return;
                }

                setQueue(res.jobQueue || []);
                setSessionStatus(res.sessionState || {});
                setProfile(res.userProfile || {});

                if (res.userResume) {
                    setResumeStatus(`Saved: ${res.userResume.name}`);
                }
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

                    <div className="card profile-form">
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

                        <input type="file"
                            name="_resumeFile"
                            accept=".pdf"
                            onChange={handleProfileChange} />

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