import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import panelStyles from './panel.css?inline';
import appStyles from './App.css?inline';

const HOST_ID = 'heisenberg-app-host';

function init() {
    if (document.getElementById(HOST_ID)) return;

    const host = document.createElement('div');
    host.id = HOST_ID;
    // Host is just a container for the shadow root, doesn't need styles itself
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Styles
    const style = document.createElement('style');
    style.textContent = panelStyles + appStyles;
    shadow.appendChild(style);

    // Toggle Button
    const toggle = document.createElement('button');
    toggle.id = 'heisenberg-toggle';
    toggle.innerHTML = '⚡';
    toggle.title = 'Open Heisenberg.ai';
    shadow.appendChild(toggle);

    // Panel Root
    const panelRoot = document.createElement('div');
    panelRoot.id = 'heisenberg-root';
    shadow.appendChild(panelRoot);

    // Render
    const root = ReactDOM.createRoot(panelRoot);
    root.render(
        <React.StrictMode>
            <SidePanel />
        </React.StrictMode>
    );

    // Toggle Logic
    toggle.addEventListener('click', () => {
        panelRoot.classList.toggle('open');
        toggle.innerHTML = panelRoot.classList.contains('open') ? '✕' : '⚡';
    });

    console.log("[Heisenberg.ai] Side panel initialized");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
