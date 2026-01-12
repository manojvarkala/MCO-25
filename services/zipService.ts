import JSZip from 'jszip';

interface CorePluginSources {
    main: string;
    styles: string;
    cpts: string;
    admin: string;
    data: string;
    shortcodes: string;
    security: string;
    routes: string;
    handlers: string;
    templates: { [key: string]: string };
}

interface SocialPluginSources {
    main: string;
    admin: string;
    handler: string;
}

/**
 * Logic to assemble and trigger download of the Core MCO Engine
 * Renames .txt source files to .php for the final WordPress ZIP
 */
export const downloadCorePluginZip = async (sources: CorePluginSources) => {
    const zip = new JSZip();
    const root = zip.folder('mco-exam-integration-engine');
    if (!root) throw new Error("FileSystem Failure during ZIP creation.");

    // Assets
    root.folder('assets')?.file('mco-styles.css', sources.styles);
    
    // Includes (Modular Logic)
    const includes = root.folder('includes');
    includes?.file('mco-security.php', sources.security);
    includes?.file('mco-cpts.php', sources.cpts);
    includes?.file('mco-admin.php', sources.admin);
    includes?.file('mco-data.php', sources.data);
    includes?.file('mco-api-routes.php', sources.routes);
    includes?.file('mco-api-handlers.php', sources.handlers);
    includes?.file('mco-shortcodes.php', sources.shortcodes);

    // Main Plugin Entry
    root.file('mco-exam-integration-engine.php', sources.main);

    // Public Templates
    const publicDir = root.folder('public');
    Object.entries(sources.templates).forEach(([name, content]) => {
        publicDir?.file(name, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'mco-exam-integration-engine-v5.2.3.zip');
};

/**
 * Logic to assemble and trigger download of the Social Poster Companion
 */
export const downloadSocialPluginZip = async (sources: SocialPluginSources) => {
    const zip = new JSZip();
    const root = zip.folder('mco-social-poster');
    if (!root) throw new Error("FileSystem Failure during ZIP creation.");

    root.file('mco-social-poster.php', sources.main);
    const includes = root.folder('includes');
    includes?.file('admin-page.php', sources.admin);
    includes?.file('post-handler.php', sources.handler);

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'mco-social-poster-v1.2.0.zip');
};

const triggerDownload = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};
