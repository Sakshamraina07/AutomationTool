import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import panelStyles from './panel.css?inline';
import appStyles from './App.css?inline';

const HOST_ID = 'internhelper-panel-root';

function init() {
    // Prevent double injection
    if (document.getElementById(HOST_ID)) return;

    // Create Host
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.right = '0';
    host.style.zIndex = '9999999';
    if (document.body && document.contains(document.body)) {
        document.body.appendChild(host);
    }

    // Create Shadow Root
    const shadow = host.attachShadow({ mode: 'open' });

    // Inject Styles
    const styleParams = [panelStyles, appStyles];

    styleParams.forEach(cssContent => {
        const style = document.createElement('style');
        style.textContent = cssContent;
        shadow.appendChild(style);
    });

    // Create Root Element
    const rootEl = document.createElement('div');
    rootEl.id = 'ih-root';
    shadow.appendChild(rootEl);

    // Render
    const root = ReactDOM.createRoot(rootEl);
    root.render(
        <React.StrictMode>
            <SidePanel />
        </React.StrictMode>
    );

    console.log("[InternHelper] Side panel injected");
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} // Start observing URL changes to re-inject if execution context is lost (SPA navigation)
// Although content scripts usually persist, re-checks can be safer for SPAs
const locationObserver = new MutationObserver(() => {
    if (!document.getElementById(HOST_ID)) {
        init();
    }
});
locationObserver.observe(document.body, { childList: true, subtree: true });
