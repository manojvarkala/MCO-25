import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadCloud, Code, Share2, ShieldCheck, Zap } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { downloadCorePluginZip, downloadSocialPluginZip } from '../services/zipService.ts';

const Integration: FC = () => {
    const [isCoreDownloading, setIsCoreDownloading] = useState(false);
    const [isSocialDownloading, setIsSocialDownloading] = useState(false);

    // Dynamic fetcher to avoid module specifier issues in native ESM
    const fetchAsset = async (path: string) => {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Status ${response.status} fetching ${path}`);
            return await response.text();
        } catch (e) {
            console.error(`Asset Assembly Error [${path}]:`, e);
            return '';
        }
    };

    const handleCoreDownload = async () => {
        setIsCoreDownloading(true);
        const tid = toast.loading('Assembling Modular API Engine...');
        try {
            // Fetch all required source files dynamically
            const [
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes,
                tExams, tBooks, tQuestions
            ] = await Promise.all([
                fetchAsset('/mco-exam-integration-engine/mco-exam-integration-engine.txt'),
                fetchAsset('/mco-exam-integration-engine/assets/mco-styles.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-security.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-cpts.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-admin.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-data.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-api-routes.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-api-handlers.txt'),
                fetchAsset('/mco-exam-integration-engine/includes/mco-shortcodes.txt'),
                fetchAsset('/template-exam-programs.csv'),
                fetchAsset('/template-recommended-books.csv'),
                fetchAsset('/template-questions.csv')
            ]);

            await downloadCorePluginZip({
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes,
                templates: {
                    'template-exam-programs.csv': tExams,
                    'template-recommended-books.csv': tBooks,
                    'template-questions.csv': tQuestions
                }
            });
            toast.success('Core Plugin ZIP Generated!', { id: tid });
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
                fetchAsset('/mco-social-poster/mco-social-poster.txt'),
                fetchAsset('/mco-social-poster/includes/admin-page.txt'),
                fetchAsset('/mco-social-poster/includes/post-handler.txt')
            ]);

            await downloadSocialPluginZip({ main, admin, handler });
            toast.success('Social Poster Generated!', { id: tid });
        } catch (e: any) {
            toast.error(e.message || 'Assembly failed', { id: tid });
        } finally {
            setIsSocialDownloading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">System Integration</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Core Engine Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner"><Code size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Modular API Engine</h2>
                            <p className="text-sm text-slate-500">v9.0.0 • Absolute CORS Priority</p>
                        </div>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-slate-600 flex-grow">
                        <li className="flex items-start gap-2"><Zap size={16} className="text-blue-500 mt-0.5" /> High-Priority Handshake (Fixes CORS Blocks)</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-blue-500 mt-0.5" /> Distributed JWT Logic & Security</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-blue-500 mt-0.5" /> Industrial Transient Caching</li>
                    </ul>
                    <button 
                        onClick={handleCoreDownload} 
                        disabled={isCoreDownloading} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    >
                        {isCoreDownloading ? <Spinner size="sm" className="text-white"/> : <DownloadCloud size={20}/>}
                        {isCoreDownloading ? 'Assembling Assets...' : 'Download Integration Plugin'}
                    </button>
                </div>

                {/* Social Poster Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-inner"><Share2 size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Social Poster</h2>
                            <p className="text-sm text-slate-500">v1.2.0 • AI-Post Link</p>
                        </div>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-slate-600 flex-grow">
                        <li className="flex items-start gap-2"><Zap size={16} className="text-purple-500 mt-0.5" /> Automatic Social Feed Sharing</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-purple-500 mt-0.5" /> Facebook & LinkedIn Dispatchers</li>
                    </ul>
                    <button 
                        onClick={handleSocialDownload} 
                        disabled={isSocialDownloading} 
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    >
                        {isSocialDownloading ? <Spinner size="sm" className="text-white"/> : <DownloadCloud size={20}/>}
                        {isSocialDownloading ? 'Assembling Assets...' : 'Download Social Poster'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-green-500/20 text-green-400 rounded-full flex-shrink-0"><ShieldCheck size={40} /></div>
                <div>
                    <h3 className="text-xl font-bold">Deployment Architecture Note</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        The v9.0.0 engine moves CORS logic to the absolute start of the request. After updating your WordPress site, perform a <strong>Hard Refresh</strong> in the browser. Ensure the <code>MCO_JWT_SECRET</code> is identical between your server and any client tokens.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Integration;