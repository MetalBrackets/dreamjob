var manifest = {
    manifest_version: 3,
    name: 'DreamJob',
    description: 'AI-assisted job application companion for LinkedIn demos.',
    version: '0.1.0',
    action: {
        default_title: 'DreamJob',
        default_popup: 'popup.html',
    },
    background: {
        service_worker: 'src/background.ts',
        type: 'module',
    },
    permissions: ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs'],
    host_permissions: ['https://www.linkedin.com/*', 'http://localhost:3000/*'],
    side_panel: {
        default_path: 'sidepanel.html',
    },
    content_scripts: [
        {
            matches: ['https://www.linkedin.com/*'],
            js: ['src/content/linkedin-job.ts'],
            run_at: 'document_idle',
        },
    ],
};
export default manifest;
