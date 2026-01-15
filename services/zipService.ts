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
 * 
 * CRITICAL FIX: The structure is now completely flat at the root of the ZIP.
 * Archive.zip
 *  ├── mco-exam-integration-engine.php
 *  ├── assets/
 *  ├── includes/
 *  └── public/
 */
export const downloadCorePluginZip = async (sources: CorePluginSources) => {
    if (!sources.main || !sources.main.includes('Plugin Name:')) {
        throw new Error("Invalid plugin source: Missing headers in mco-exam-integration-engine.php");
    }

    const zip = new JSZip();

    // 1. Main Entry (At ROOT for immediate WP detection)
    zip.file('mco-exam-integration-engine.php', sources.main.trim());

    // 2. Assets (Directly at root)
    const assets = zip.folder('assets');
    if (assets) assets.file('mco-styles.css', sources.styles);
    
    // 3. Includes (Directly at root)
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

    // 4. Public Templates (Directly at root)
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
 * Logic to assemble the Social Poster ZIP (Flat structure).
 */
export const downloadSocialPluginZip = async (sources: SocialPluginSources) => {
    const zip = new JSZip();

    zip.file('mco-social-poster.php', sources.main.trim());

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