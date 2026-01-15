import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadCloud, Code, Share2, ShieldCheck, Zap } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { downloadCorePluginZip, downloadSocialPluginZip } from '../services/zipService.ts';

const Integration: FC = () => {
    const [isCoreDownloading, setIsCoreDownloading] = useState(false);
    const [isSocialDownloading, setIsSocialDownloading] = useState(false);

    // Dynamic asset loader to bypass module specifier issues
    const loadSource = async (path: string) => {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status} on ${path}`);
            return await response.text();
        } catch (e) {
            console.error(`Assembly Error: Could not load ${path}`, e);
            return ''; // Fallback to empty string to avoid breaking zip creation
        }
    };

    const handleCoreDownload = async () => {
        setIsCoreDownloading(true);
        const tid = toast.loading('Assembling Optimized API Engine...');
        try {
            // Fetch all source files dynamically from the public folder
            const [
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes, woocommerce,
                tExams, tBooks, tQuestions
            ] = await Promise.all([
                loadSource('/mco-exam-integration-engine/mco-exam-integration-engine.txt'),
                loadSource('/mco-exam-integration-engine/assets/mco-styles.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-security.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-cpts.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-admin.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-data.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-api-routes.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-api-handlers.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-shortcodes.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-woocommerce.txt'),
                loadSource('/template-exam-programs.csv'),
                loadSource('/template-recommended-books.csv'),
                loadSource('/template-questions.csv')
            ]);

            await downloadCorePluginZip({
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes, woocommerce,
                templates: {
                    'template-exam-programs.csv': tExams,
                    'template-recommended-books.csv': tBooks,
                    'template-questions.csv': tQuestions
                }
            });
            toast.success('Plugin Assembled & Ready!', { id: tid });
        } catch (e: any) {
            toast.error(e.message || 'Assembly failed', { id: tid });
        } finally {
            setIsCoreDownloading(false);
        }
    };

    const handleSocialDownload = async () => {
        setIsSocialDownloading(true);
        const tid = toast.loading('Assembling Social Poster...');
        try {
            const [main, admin, handler] = await Promise.all([
                loadSource('/mco-social-poster/mco-social-poster.txt'),
                loadSource('/mco-social-poster/includes/admin-page.txt'),
                loadSource('/mco-social-poster/includes/post-handler.txt')
            ]);

            await downloadSocialPluginZip({ main, admin, handler });
            toast.success('Social Poster Ready!', { id: tid });
        } catch (e: any) {
            toast.error(e.message || 'Assembly failed', { id: tid });
        } finally {
            setIsSocialDownloading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Developer Integrations</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Main Engine Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Code size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Modular API Engine</h2>
                            <p className="text-sm text-slate-500">v5.2.4 • Flat Archive Optimized</p>
                        </div>
                    </div>
                    <div className="flex-grow space-y-4 mb-8">
                        <p className="text-sm text-slate-600">The core backend component. Handles SSO, JWT validation, and high-priority CORS handshaking to eliminate connection blocking. Now uses a flat ZIP structure for improved WordPress installer compatibility.</p>
                        <ul className="space-y-2 text-xs text-slate-500">
                            <li className="flex items-center gap-2"><Zap size={14} className="text-blue-500" /> Installer-Friendly Root Headers</li>
                            <li className="flex items-center gap-2"><Zap size={14} className="text-blue-500" /> Virtual Order Auto-Complete</li>
                            <li className="flex items-center gap-2"><Zap size={14} className="text-blue-500" /> Early-Exit CORS Handshake</li>
                        </ul>
                    </div>
                    <button 
                        onClick={handleCoreDownload} 
                        disabled={isCoreDownloading} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                    >
                        {isCoreDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isCoreDownloading ? 'Gathering Sources...' : 'Download Integration Plugin'}
                    </button>
                </div>

                {/* Social Poster Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Share2 size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Social Poster</h2>
                            <p className="text-sm text-slate-500">v1.2.0 • AI-Share Link</p>
                        </div>
                    </div>
                    <div className="flex-grow space-y-4 mb-8">
                        <p className="text-sm text-slate-600">Companion plugin that automatically shares your AI-generated blog posts to Facebook and LinkedIn feeds. Now also updated with the optimized ZIP structure.</p>
                        <ul className="space-y-2 text-xs text-slate-500">
                            <li className="flex items-center gap-2"><Zap size={14} className="text-purple-500" /> Automated Social Dispatch</li>
                            <li className="flex items-center gap-2"><Zap size={14} className="text-purple-500" /> Facebook Graph API Integration</li>
                        </ul>
                    </div>
                    <button 
                        onClick={handleSocialDownload} 
                        disabled={isSocialDownloading} 
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                    >
                        {isSocialDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isSocialDownloading ? 'Gathering Sources...' : 'Download Social Poster'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-2xl flex items-start gap-6">
                <div className="p-4 bg-green-500/20 text-green-400 rounded-full flex-shrink-0"><ShieldCheck size={40} /></div>
                <div>
                    <h3 className="text-xl font-bold">Post-Deployment Critical Step</h3>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        After uploading and activating the plugin, you <strong>MUST</strong> ensure your <code>MCO_JWT_SECRET</code> in your WordPress <code>wp-config.php</code> matches your organization's security standards.
                    </p>
                    <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700 font-mono text-xs text-cyan-400">
                        define('MCO_JWT_SECRET', 'your-long-random-string-here');
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Integration;