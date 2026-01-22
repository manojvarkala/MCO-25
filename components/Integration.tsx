import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadCloud, Code, Share2 } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { downloadCorePluginZip, downloadSocialPluginZip } from '../services/zipService.ts';

// --- VITE RAW IMPORTS ---
// This embeds the source code directly into the bundle, removing dependency on runtime server-side static routing.
// @ts-ignore
import coreMain from '../mco-exam-integration-engine/mco-exam-integration-engine.txt?raw';
// @ts-ignore
import coreStyles from '../mco-exam-integration-engine/assets/mco-styles.txt?raw';
// @ts-ignore
import coreSecurity from '../mco-exam-integration-engine/includes/mco-security.txt?raw';
// @ts-ignore
import coreCpts from '../mco-exam-integration-engine/includes/mco-cpts.txt?raw';
// @ts-ignore
import coreAdmin from '../mco-exam-integration-engine/includes/mco-admin.txt?raw';
// @ts-ignore
import coreData from '../mco-exam-integration-engine/includes/mco-data.txt?raw';
// @ts-ignore
import coreRoutes from '../mco-exam-integration-engine/includes/mco-api-routes.txt?raw';
// @ts-ignore
import coreHandlers from '../mco-exam-integration-engine/includes/mco-api-handlers.txt?raw';
// @ts-ignore
import coreShortcodes from '../mco-exam-integration-engine/includes/mco-shortcodes.txt?raw';
// @ts-ignore
import coreWoo from '../mco-exam-integration-engine/includes/mco-woocommerce.txt?raw';

// @ts-ignore
import socialMain from '../mco-social-poster/mco-social-poster.txt?raw';
// @ts-ignore
import socialAdmin from '../mco-social-poster/includes/admin-page.txt?raw';
// @ts-ignore
import socialHandler from '../mco-social-poster/includes/post-handler.txt?raw';

const Integration: FC = () => {
    const [isCoreDownloading, setIsCoreDownloading] = useState(false);
    const [isSocialDownloading, setIsSocialDownloading] = useState(false);

    /**
     * Standard fetch for files specifically in the public directory.
     * Public files are accessible via the root path at runtime.
     */
    const fetchPublicAsset = async (path: string) => {
        // Ensure path starts with / and remove public/ prefix if accidental
        const cleanPath = path.replace('public/', '/');
        const response = await fetch(`${cleanPath}?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Template asset missing: ${cleanPath}`);
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE')) throw new Error(`Template redirected to HTML: ${cleanPath}`);
        return text;
    };

    const handleCoreDownload = async () => {
        setIsCoreDownloading(true);
        const tid = toast.loading('Assembling Integration Engine...');
        try {
            // Fetch templates from /public
            const [tExams, tBooks, tQuestions] = await Promise.all([
                fetchPublicAsset('/template-exam-programs.csv'),
                fetchPublicAsset('/template-recommended-books.csv'),
                fetchPublicAsset('/template-questions.csv')
            ]);

            await downloadCorePluginZip({
                main: coreMain,
                styles: coreStyles,
                security: coreSecurity,
                cpts: coreCpts,
                admin: coreAdmin,
                data: coreData,
                routes: coreRoutes,
                handlers: coreHandlers,
                shortcodes: coreShortcodes,
                woocommerce: coreWoo,
                templates: {
                    'template-exam-programs.csv': tExams,
                    'template-recommended-books.csv': tBooks,
                    'template-questions.csv': tQuestions
                }
            });
            
            toast.success('Core Engine Ready!', { id: tid });
        } catch (e: any) {
            console.error("Plugin Assembly Error:", e);
            toast.error(e.message, { id: tid, duration: 6000 });
        } finally {
            setIsCoreDownloading(false);
        }
    };

    const handleSocialDownload = async () => {
        setIsSocialDownloading(true);
        const tid = toast.loading('Assembling Social Poster...');
        try {
            await downloadSocialPluginZip({ 
                main: socialMain, 
                admin: socialAdmin, 
                handler: socialHandler 
            });
            toast.success('Social Poster Ready!', { id: tid });
        } catch (e: any) {
            toast.error(e.message, { id: tid });
        } finally {
            setIsSocialDownloading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <h1 className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display">Integrations</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Code size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">API Engine</h2>
                            <p className="text-sm text-slate-500 font-mono">v5.2.4</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-8">The core backend component for WordPress. Handles SSO, JWT, and Exams.</p>
                    <button onClick={handleCoreDownload} disabled={isCoreDownloading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50">
                        {isCoreDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isCoreDownloading ? 'Bundling...' : 'Download Core Plugin'}
                    </button>
                </div>

                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Share2 size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Social Poster</h2>
                            <p className="text-sm text-slate-500 font-mono">v1.2.0</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-8">Auto-share AI blog posts to Facebook and LinkedIn.</p>
                    <button onClick={handleSocialDownload} disabled={isSocialDownloading} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50">
                        {isSocialDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isSocialDownloading ? 'Assembling...' : 'Download Social Poster'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Integration;