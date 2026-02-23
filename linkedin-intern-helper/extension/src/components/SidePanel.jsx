import React, { useState, useEffect } from 'react';
import App from '../App';
// Styles are injected by main_panel.jsx into Shadow DOM

const SidePanel = () => {
    return (
        <div className="ih-panel-content">
            <App />
        </div>
    );
};

export default SidePanel;
