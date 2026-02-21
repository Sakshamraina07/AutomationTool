import React, { useState, useEffect } from 'react';
import App from '../App';
// Styles are injected by main_panel.jsx into Shadow DOM

const SidePanel = () => {
    const [isOpen, setIsOpen] = useState(false);

    const togglePanel = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`ih-panel-container ${isOpen ? 'open' : 'collapsed'}`}>
            <button className="ih-toggle-btn" onClick={togglePanel}>
                {isOpen ? '›' : '‹'}
            </button>
            <div className="ih-panel-content">
                <App />
            </div>
        </div>
    );
};

export default SidePanel;
