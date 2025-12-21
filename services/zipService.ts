
import JSZip from 'jszip';

interface CorePluginSources {
    main: string;
    styles: string;
    cpts: string;
    admin: string;
    data: string;
    shortcodes: string;
    apiParts: string[];
    templates: { [key: string]: string };
}

interface SocialPluginSources {
    main: string;
    admin: string;
    handler: string;
}

/**
 * Logic to assemble and trigger download of the Core MCO Engine
 */
export const downloadCorePluginZip = async (sources: CorePluginSources) => {
    const zip = new JSZip();
    const root = zip.folder('mco-exam-integration-engine');
    if (!root) throw new Error("FS Failure");

    root.folder('assets')?.file('mco-styles.css', sources.styles);
    const includes = root.folder('includes');
    const publicDir = root.folder('public');

    // Reassemble the 15-part API file
    const fullApi = sources.apiParts.join("\n\n");

    root.file('mco-exam-integration-engine.php', sources.main);
    includes?.file('mco-cpts.php', sources.cpts);
    includes?.file('mco-admin.php', sources.admin);
    includes?.file('mco-api.php', fullApi);
    includes?.file('mco-data.php', sources.data);
    includes?.file('mco-shortcodes.php', sources.shortcodes);

    // Add templates
    Object.entries(sources.templates).forEach(([name, content]) => {
        publicDir?.file(name, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'mco-core-engine-v3.6.0.zip');
};

/**
 * Logic to assemble and trigger download of the Social Poster Companion
 */
export const downloadSocialPluginZip = async (sources: SocialPluginSources) => {
    const zip = new JSZip();
    const root = zip.folder('mco-social-poster');
    if (!root) throw new Error("FS Failure");

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
