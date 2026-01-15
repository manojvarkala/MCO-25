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
 * Logic to assemble the Core MCO Engine ZIP.
 * All files are added to the ROOT of the ZIP to ensure WordPress detection.
 */
export const downloadCorePluginZip = async (sources: CorePluginSources) => {
    const zip = new JSZip();

    // 1. Main Plugin Entry (Root)
    zip.file('mco-exam-integration-engine.php', sources.main);

    // 2. Assets Subdirectory (Root-level)
    const assets = zip.folder('assets');
    if (assets) {
        assets.file('mco-styles.css', sources.styles);
    }
    
    // 3. Includes Subdirectory (Root-level)
    const includes = zip.folder('includes');
    if (includes) {
        includes.file('mco-security.php', sources.security);
        includes.file('mco-cpts.php', sources.cpts);
        includes.file('mco-admin.php', sources.admin);
        includes.file('mco-data.php', sources.data);
        includes.file('mco-api-routes.php', sources.routes);
        includes.file('mco-api-handlers.php', sources.handlers);
        includes.file('mco-shortcodes.php', sources.shortcodes);
        includes.file('mco-woocommerce.php', sources.woocommerce);
    }

    // 4. Public Templates Subdirectory (Root-level)
    const publicDir = zip.folder('public');
    if (publicDir) {
        Object.entries(sources.templates).forEach(([name, content]) => {
            publicDir.file(name, content);
        });
    }

    const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
    
    triggerDownload(blob, 'mco-exam-integration-engine.zip');
};

/**
 * Logic to assemble the Social Poster ZIP.
 */
export const downloadSocialPluginZip = async (sources: SocialPluginSources) => {
    const zip = new JSZip();

    // Main Entry (Root)
    zip.file('mco-social-poster.php', sources.main);

    // Includes (Root-level)
    const includes = zip.folder('includes');
    if (includes) {
        includes.file('admin-page.php', sources.admin);
        includes.file('post-handler.php', sources.handler);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'mco-social-poster.zip');
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