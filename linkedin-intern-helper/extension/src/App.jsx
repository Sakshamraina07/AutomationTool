import React, { useState, useEffect } from 'react';

/**
 * Heisenberg.ai - Premium Adaptive UI
 * Strictly isolated from automation core.
 */

function App() {
    const [view, setView] = useState('workflow');
    const [profile, setProfile] = useState({ full_name: '', email: '', phone: '' });
    const [isComplete, setIsComplete] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'success'

    useEffect(() => {
        chrome.storage.local.get(['userProfile'], (res) => {
            if (res.userProfile) {
                setProfile(res.userProfile);
                checkCompleteness(res.userProfile);
            } else {
                setIsComplete(false);
            }
        });
    }, []);

    const checkCompleteness = (p) => {
        const complete = !!(p.full_name && p.email && p.phone);
        setIsComplete(complete);
    };

    const handleSave = () => {
        setSaveStatus('saving');
        chrome.storage.local.set({ userProfile: profile }, () => {
            setTimeout(() => {
                setSaveStatus('success');
                checkCompleteness(profile);
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 400);
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="heisenberg-root">
            <div className="popup-container">
                <header className="header">
                    <h1>Heisenberg.ai</h1>
                    <span className="tagline">Precision job applications.</span>
                </header>

                <nav className="tabs">
                    <button
                        className={`tab-btn ${view === 'workflow' ? 'active' : ''}`}
                        onClick={() => setView('workflow')}
                    >
                        Workflow
                    </button>
                    <button
                        className={`tab-btn ${view === 'profile' ? 'active' : ''}`}
                        onClick={() => setView('profile')}
                    >
                        Profile
                    </button>
                </nav>

                <main className="main-content">
                    {!isComplete && (
                        <div className="warning-banner">
                            <span>⚠️ Setup your profile to enable auto-apply.</span>
                        </div>
                    )}

                    {view === 'workflow' ? (
                        <div className="workflow-view">
                            <h2 className="section-title">Setup Guide</h2>

                            <div className="workflow-step">
                                <div className="step-number">1</div>
                                <div className="step-info">
                                    <span className="step-title">Load Extension</span>
                                    <p className="step-desc">
                                        In <code>chrome://extensions</code>, enable <b>Developer Mode</b> and load the extracted folder.
                                    </p>
                                </div>
                            </div>

                            <div className="workflow-step">
                                <div className="step-number">2</div>
                                <div className="step-info">
                                    <span className="step-title">Verify Status</span>
                                    <p className="step-desc">
                                        Ensure the <b>Service Worker</b> is active. Refresh LinkedIn if detection fails.
                                    </p>
                                </div>
                            </div>

                            <div className="workflow-step">
                                <div className="step-number">3</div>
                                <div className="step-info">
                                    <span className="step-title">Apply Effortlessly</span>
                                    <p className="step-desc">
                                        Open any LinkedIn job with <b>Easy Apply</b>. Heisenberg.ai handles the rest automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-view">
                            <h2 className="section-title">Your Identity</h2>

                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    name="full_name"
                                    placeholder="Walter White"
                                    value={profile.full_name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="heisenberg@albuquerque.com"
                                    value={profile.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    name="phone"
                                    placeholder="+1 (505) 123-4567"
                                    value={profile.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <button
                                className={`btn-save ${saveStatus === 'success' ? 'success' : ''}`}
                                onClick={handleSave}
                                disabled={saveStatus === 'saving'}
                            >
                                {saveStatus === 'idle' ? 'Save Profile' : saveStatus === 'saving' ? 'Saving...' : 'Changes Saved ✓'}
                            </button>
                        </div>
                    )}
                </main>

                <footer className="footer">
                    <div className="footer-inner">
                        <span className="footer-brand">Heisenberg.ai v1.1</span>
                        <span className="footer-tagline">“Uncertainty eliminated.”</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;