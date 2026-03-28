declare const manifest: {
    manifest_version: 3;
    name: string;
    description: string;
    version: string;
    action: {
        default_title: string;
        default_popup: string;
    };
    background: {
        service_worker: string;
        type: "module";
    };
    permissions: ("activeTab" | "scripting" | "sidePanel" | "storage" | "tabs")[];
    host_permissions: string[];
    side_panel: {
        default_path: string;
    };
    content_scripts: {
        matches: string[];
        js: string[];
        run_at: string;
    }[];
};
export default manifest;
