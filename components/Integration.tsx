import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadCloud, Code, Share2, ShieldAlert, FileCheck, Zap } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { downloadCorePluginZip, downloadSocialPluginZip } from '../services/zipService.ts';

const Integration: FC = () => {
    const [isCoreDownloading, setIsCoreDownloading] = useState(false);
    const [isSocialDownloading, setIsSocialDownloading] = useState(false);

    /**
     * Relative path loader that targets the root source folders.
     */
    const loadSource = async (path: string, isPhp: boolean = true) => {
        try {
            // Remove leading slash if it exists to ensure relative fetching from project root
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            const response = await fetch(`${cleanPath}?nocache=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status} for ${cleanPath}`);
            }
            
            const text = await response.text();
            const trimmed = text.trim();

            // Detection for "Redirected to HTML" error
            if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html')) {
                throw new Error(`Asset missing or server redirected to index.html (Path: ${cleanPath})`);
            }

            if (isPhp && !trimmed.includes('<?php')) {
                throw new Error(`File at ${cleanPath} does not appear to be a valid PHP source.`);
            }

            return text;
        } catch (e: any) {
            const fileName = path.split('/').pop() || 'Unknown';
            throw new Error(`[${fileName}] ${e.message}`);
        }
    };

    const handleCoreDownload = async () => {
        setIsCoreDownloading(true);
        const tid = toast.loading('Assembling Integration Engine...');
        try {
            const [
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes, woocommerce,
                tExams, tBooks, tQuestions
            ] = await Promise.all([
                loadSource('mco-exam-integration-engine/mco-exam-integration-engine.txt'),
                loadSource('mco-exam-integration-engine/assets/mco-styles.txt', false),
                loadSource('mco-exam-integration-engine/includes/mco-security.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-cpts.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-admin.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-data.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-api-routes.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-api-handlers.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-shortcodes.txt'),
                loadSource('mco-exam-integration-engine/includes/mco-woocommerce.txt'),
                loadSource('public/template-exam-programs.csv', false),
                loadSource('public/template-recommended-books.csv', false),
                loadSource('public/template-questions.csv', false)
            ]);

            await downloadCorePluginZip({
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes, woocommerce,
                templates: {
                    'template-exam-programs.csv': tExams,
                    'template-recommended-books.csv': tBooks,
                    'template-questions.csv': tQuestions
                }
            });
            
            toast.success('Core Engine Ready!', { id: tid });
        } catch (e: any) {
            console.error("Plugin Assembly Error:", e);
            toast.error(e.message, { id: tid, duration: 8000 });
        } finally {
            setIsCoreDownloading(false);
        }
    };

    const handleSocialDownload = async () => {
        setIsSocialDownloading(true);
        const tid = toast.loading('Assembling Social Poster...');
        try {
            const [main, admin, handler] = await Promise.all([
                loadSource('mco-social-poster/mco-social-poster.txt'),
                loadSource('mco-social-poster/includes/admin-page.txt'),
                loadSource('mco-social-poster/includes/post-handler.txt')
            ]);

            await downloadSocialPluginZip({ main, admin, handler });
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
                        {isCoreDownloading ? 'Validating Assets...' : 'Download Core Plugin'}
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