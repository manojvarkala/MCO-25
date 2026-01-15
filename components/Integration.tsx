import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadCloud, Code, Share2, ShieldCheck, Zap, AlertTriangle, FileCheck, ShieldAlert } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { downloadCorePluginZip, downloadSocialPluginZip } from '../services/zipService.ts';

const Integration: FC = () => {
    const [isCoreDownloading, setIsCoreDownloading] = useState(false);
    const [isSocialDownloading, setIsSocialDownloading] = useState(false);

    /**
     * Enhanced source loader that detects if the server returned HTML (SPA fallback)
     * instead of the raw code, preventing invalid ZIP files.
     */
    const loadSource = async (path: string, isPhp: boolean = true) => {
        try {
            // Append timestamp to prevent caching issues
            const response = await fetch(`${path}?nocache=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            
            const text = await response.text();
            const trimmed = text.trim();

            // CRITICAL VALIDATION: Detect SPA redirect to index.html
            if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html')) {
                console.error(`Validation Failed for ${path}: Content is HTML, not code.`);
                throw new Error("Asset missing or server configuration error (Redirected to HTML).");
            }

            if (!trimmed) {
                throw new Error("File content is empty.");
            }

            // PHP basic validation
            if (isPhp && !trimmed.includes('<?php')) {
                throw new Error("Invalid PHP source: Missing opening tag.");
            }

            return text;
        } catch (e: any) {
            const fileName = path.split('/').pop() || 'Unknown File';
            throw new Error(`[${fileName}] ${e.message}`);
        }
    };

    const handleCoreDownload = async () => {
        setIsCoreDownloading(true);
        const tid = toast.loading('Assembling & Validating Core Logic...');
        try {
            // Fetch all source components. Paths are relative to the site root.
            const [
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes, woocommerce,
                tExams, tBooks, tQuestions
            ] = await Promise.all([
                loadSource('/mco-exam-integration-engine/mco-exam-integration-engine.txt'),
                loadSource('/mco-exam-integration-engine/assets/mco-styles.txt', false),
                loadSource('/mco-exam-integration-engine/includes/mco-security.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-cpts.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-admin.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-data.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-api-routes.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-api-handlers.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-shortcodes.txt'),
                loadSource('/mco-exam-integration-engine/includes/mco-woocommerce.txt'),
                loadSource('/template-exam-programs.csv', false),
                loadSource('/template-recommended-books.csv', false),
                loadSource('/template-questions.csv', false)
            ]);

            // Final check for plugin headers
            if (!main.includes('Plugin Name:')) {
                throw new Error("Main plugin file is corrupt or missing headers.");
            }

            await downloadCorePluginZip({
                main, styles, security, cpts, admin, data, routes, handlers, shortcodes, woocommerce,
                templates: {
                    'template-exam-programs.csv': tExams,
                    'template-recommended-books.csv': tBooks,
                    'template-questions.csv': tQuestions
                }
            });
            
            toast.success('Source Validation Passed. Plugin Ready!', { id: tid });
        } catch (e: any) {
            console.error("ZIP Generation Failure:", e.message);
            toast.error(e.message || 'Assembly failed', { id: tid, duration: 6000 });
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
            <h1 className="text-4xl font-black text-[rgb(var(--color-text-strong-rgb))] font-display">Developer Integrations</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Main Engine Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner"><Code size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Modular API Engine</h2>
                            <p className="text-sm text-slate-500 font-mono">v5.2.4 • Root-Level Entry</p>
                        </div>
                    </div>
                    <div className="flex-grow space-y-4 mb-8">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            The core backend component. Handles SSO, JWT validation, and high-priority CORS handshaking. 
                            The generator now performs <strong>Strict Content Validation</strong> to ensure files contain PHP logic before zipping.
                        </p>
                        <ul className="space-y-2 text-[10px] font-black uppercase tracking-widest">
                            <li className="flex items-center gap-2 text-emerald-600"><FileCheck size={14} /> Source-Verified Logic</li>
                            <li className="flex items-center gap-2 text-blue-600"><Zap size={14} /> Flat Archive Structure</li>
                            <li className="flex items-center gap-2 text-blue-600"><Zap size={14} /> Named PHP Hook compatibility</li>
                        </ul>
                    </div>
                    <button 
                        onClick={handleCoreDownload} 
                        disabled={isCoreDownloading} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                    >
                        {isCoreDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isCoreDownloading ? 'Running Sanity Checks...' : 'Download Integration Plugin'}
                    </button>
                </div>

                {/* Social Poster Card */}
                <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-2xl shadow-xl border border-[rgb(var(--color-border-rgb))] flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-inner"><Share2 size={32} /></div>
                        <div>
                            <h2 className="text-2xl font-bold">Social Poster</h2>
                            <p className="text-sm text-slate-500 font-mono">v1.2.0 • Auto-Share</p>
                        </div>
                    </div>
                    <div className="flex-grow space-y-4 mb-8">
                        <p className="text-sm text-slate-600 leading-relaxed">Companion plugin that automatically shares your AI-generated blog posts to Facebook and LinkedIn feeds. Optimized with the same robust validation checks.</p>
                        <ul className="space-y-2 text-[10px] font-black uppercase tracking-widest">
                            <li className="flex items-center gap-2 text-purple-600"><Zap size={14} /> Automated Social Dispatch</li>
                            <li className="flex items-center gap-2 text-purple-600"><Zap size={14} /> Facebook Graph API Integration</li>
                        </ul>
                    </div>
                    <button 
                        onClick={handleSocialDownload} 
                        disabled={isSocialDownloading} 
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                    >
                        {isSocialDownloading ? <Spinner size="sm"/> : <DownloadCloud size={20}/>}
                        {isSocialDownloading ? 'Assembling...' : 'Download Social Poster'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-2xl flex items-start gap-6">
                <div className="p-4 bg-rose-500/20 text-rose-400 rounded-full flex-shrink-0"><ShieldAlert size={40} /></div>
                <div>
                    <h3 className="text-xl font-bold">Installer Troubleshooting</h3>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        If WordPress reports "No valid plugins found", ensure your server isn't returning a 404 page for <code>.txt</code> files. 
                        The generator now blocks the download if it detects HTML content instead of PHP code. 
                        Check the browser console for specific <code>[Asset Name]</code> validation errors.
                    </p>
                    <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700 font-mono text-xs text-cyan-400">
                        Status: Validation Engine Operational
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Integration;