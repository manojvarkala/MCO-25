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
    woocommerce: string;
    templates: { [key: string]: string };
}

interface SocialPluginSources {
    main: string;
    admin: string;
    handler: string;
}

/**
 * Logic to assemble and trigger download of the Core MCO Engine.
 * FILES ARE NOW ADDED DIRECTLY TO THE ROOT OF THE ZIP (Flat Structure)
 * to ensure WordPress identifies the plugin header correctly.
 */
export const downloadCorePluginZip = async (sources: CorePluginSources) => {
    const zip = new JSZip();

    // 1. Main Plugin Entry (MUST be at root)
    zip.file('mco-exam-integration-engine.php', sources.main);

    // 2. Assets Subdirectory
    const assets = zip.folder('assets');
    assets?.file('mco-styles.css', sources.styles);
    
    // 3. Includes Subdirectory (Modular Logic)
    const includes = zip.folder('includes');
    includes?.file('mco-security.php', sources.security);
    includes?.file('mco-cpts.php', sources.cpts);
    includes?.file('mco-admin.php', sources.admin);
    includes?.file('mco-data.php', sources.data);
    includes?.file('mco-api-routes.php', sources.routes);
    includes?.file('mco-api-handlers.php', sources.handlers);
    includes?.file('mco-shortcodes.php', sources.shortcodes);
    includes?.file('mco-woocommerce.php', sources.woocommerce);

    // 4. Public Templates Subdirectory
    const publicDir = zip.folder('public');
    Object.entries(sources.templates).forEach(([name, content]) => {
        publicDir?.file(name, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'mco-exam-integration-engine-v5.2.4.zip');
};

/**
 * Logic to assemble and trigger download of the Social Poster Companion.
 * Uses the same flat structure for maximum compatibility.
 */
export const downloadSocialPluginZip = async (sources: SocialPluginSources) => {
    const zip = new JSZip();

    // Main Entry
    zip.file('mco-social-poster.php', sources.main);

    // Subdirectory logic
    const includes = zip.folder('includes');
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