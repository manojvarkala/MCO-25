
import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadCloud, Code, Share2, ShieldCheck, Zap } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { downloadCorePluginZip, downloadSocialPluginZip } from '../services/zipService.ts';

// --- RAW IMPORTS ---
import mainPluginFile from '../mco-exam-integration-engine/mco-exam-integration-engine.txt?raw';
import stylesFile from '../mco-exam-integration-engine/assets/mco-styles.txt?raw';
import cptsFile from '../mco-exam-integration-engine/includes/mco-cpts.txt?raw';
import adminFile from '../mco-exam-integration-engine/includes/mco-admin.txt?raw';
import dataFile from '../mco-exam-integration-engine/includes/mco-data.txt?raw';
import shortcodesFile from '../mco-exam-integration-engine/includes/mco-shortcodes.txt?raw';
import apiFile from '../mco-exam-integration-engine/includes/mco-api.txt?raw';


import socialMain from '../mco-social-poster/mco-social-poster.txt?raw';
import socialAdmin from '../mco-social-poster/includes/admin-page.txt?raw';
import socialHandler from '../mco-social-poster/includes/post-handler.txt?raw';

import templateExams from '../public/template-exam-programs.csv?raw';
import templateBooks from '../public/template-recommended-books.csv?raw';
import templateQuestions from '../public/template-questions.csv?raw';

const Integration: FC = () => {
    const [isCoreDownloading, setIsCoreDownloading] = useState(false);
    const [isSocialDownloading, setIsSocialDownloading] = useState(false);

    const handleCoreDownload = async () => {
        setIsCoreDownloading(true);
        const tid = toast.loading('Assembling Core API Engine...');
        try {
            await downloadCorePluginZip({
                main: mainPluginFile,
                styles: stylesFile,
                cpts: cptsFile,
                admin: adminFile,
                data: dataFile,
                shortcodes: shortcodesFile,
                api: apiFile,
                templates: {
                    'template-exam-programs.csv': templateExams,
                    'template-recommended-books.csv': templateBooks,
                    'template-questions.csv': templateQuestions
                }
            });
            toast.success('Core Engine Downloaded!', { id: tid });
        } catch (e: any) {
            toast.error(e.message, { id: tid });
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
            toast.success('Social Poster Downloaded!', { id: tid });
        } catch (e: any) {
            toast.error(e.message, { id: tid });
        } finally {
            setIsSocialDownloading(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">System Integration</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Core Engine Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Code size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Core API Engine</h2>
                            <p className="text-sm text-slate-500">Plugin v3.6.0 • JWT & WC Sync</p>
                        </div>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-slate-600 flex-grow">
                        <li className="flex items-start gap-2"><Zap size={16} className="text-blue-500 mt-0.5" /> 44 Secure REST Endpoints</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-blue-500 mt-0.5" /> SSO / JWT Login Architecture</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-blue-500 mt-0.5" /> Google Sheets Question Proxy</li>
                    </ul>
                    <button 
                        onClick={handleCoreDownload} 
                        disabled={isCoreDownloading} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {isCoreDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isCoreDownloading ? 'Assembling...' : 'Download Core Engine'}
                    </button>
                </div>

                {/* Social Poster Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Share2 size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Social Poster</h2>
                            <p className="text-sm text-slate-500">Plugin v1.2.0 • FB & LinkedIn</p>
                        </div>
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-slate-600 flex-grow">
                        <li className="flex items-start gap-2"><Zap size={16} className="text-purple-500 mt-0.5" /> Automatic AI Content Sharing</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-purple-500 mt-0.5" /> Integrated Auth Token Storage</li>
                        <li className="flex items-start gap-2"><Zap size={16} className="text-purple-500 mt-0.5" /> Low-Latency Webhook Listening</li>
                    </ul>
                    <button 
                        onClick={handleSocialDownload} 
                        disabled={isSocialDownloading} 
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {isSocialDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isSocialDownloading ? 'Assembling...' : 'Download Social Poster'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-6">
                <div className="p-4 bg-green-500/20 text-green-400 rounded-full"><ShieldCheck size={40} /></div>
                <div>
                    <h3 className="text-xl font-bold">Post-Download Security Notice</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                        Remember to define your <code>MCO_JWT_SECRET</code> in <strong>wp-config.php</strong> immediately after activation. Ensure your <strong>Main Site URL</strong> is correctly configured to prevent CORS blocking.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Integration;
