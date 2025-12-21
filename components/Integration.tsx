
import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { DownloadCloud, Code, Share2 } from 'lucide-react';
import Spinner from './Spinner.tsx';

// API Octopus Imports (15 Parts)
import apiP1 from '../mco-exam-integration-engine/includes/mco-api-part1.txt?raw';
import apiP2 from '../mco-exam-integration-engine/includes/mco-api-part2.txt?raw';
import apiP3 from '../mco-exam-integration-engine/includes/mco-api-part3.txt?raw';
import apiP4 from '../mco-exam-integration-engine/includes/mco-api-part4.txt?raw';
import apiP5 from '../mco-exam-integration-engine/includes/mco-api-part5.txt?raw';
import apiP6 from '../mco-exam-integration-engine/includes/mco-api-part6.txt?raw';
import apiP7 from '../mco-exam-integration-engine/includes/mco-api-part7.txt?raw';
import apiP8 from '../mco-exam-integration-engine/includes/mco-api-part8.txt?raw';
import apiP9 from '../mco-exam-integration-engine/includes/mco-api-part9.txt?raw';
import apiP10 from '../mco-exam-integration-engine/includes/mco-api-part10.txt?raw';
import apiP11 from '../mco-exam-integration-engine/includes/mco-api-part11.txt?raw';
import apiP12 from '../mco-exam-integration-engine/includes/mco-api-part12.txt?raw';
import apiP13 from '../mco-exam-integration-engine/includes/mco-api-part13.txt?raw';
import apiP14 from '../mco-exam-integration-engine/includes/mco-api-part14.txt?raw';
import apiP15 from '../mco-exam-integration-engine/includes/mco-api-part15.txt?raw';

// Core Engine Files
import mainPluginFile from '../mco-exam-integration-engine/mco-exam-integration-engine.txt?raw';
import stylesFile from '../mco-exam-integration-engine/assets/mco-styles.txt?raw';
import cptsFile from '../mco-exam-integration-engine/includes/mco-cpts.txt?raw';
import adminFile from '../mco-exam-integration-engine/includes/mco-admin.txt?raw';
import dataFile from '../mco-exam-integration-engine/includes/mco-data.txt?raw';
import shortcodesFile from '../mco-exam-integration-engine/includes/mco-shortcodes.txt?raw';

// Social Poster Files
import socialMainFile from '../mco-social-poster/mco-social-poster.txt?raw';
import socialAdminFile from '../mco-social-poster/includes/admin-page.txt?raw';
import socialHandlerFile from '../mco-social-poster/includes/post-handler.txt?raw';

const Integration: FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    
    const generateEngineZip = async () => {
        setIsGenerating(true);
        const toastId = toast.loading('Bundling Multi-Plugin Master Suite...');
        try {
            const zip = new JSZip();
            
            // --- 1. CORE API ENGINE ---
            const engineRoot = zip.folder('mco-exam-integration-engine');
            if (!engineRoot) throw new Error("FS Failure");

            engineRoot.folder('assets').file('mco-styles.css', stylesFile);
            const engineIncludes = engineRoot.folder('includes');
            
            const fullApi = [
                apiP1, apiP2, apiP3, apiP4, apiP5, apiP6, apiP7, apiP8,
                apiP9, apiP10, apiP11, apiP12, apiP13, apiP14, apiP15
            ].join("\n\n");

            engineRoot.file('mco-exam-integration-engine.php', mainPluginFile);
            engineIncludes.file('mco-cpts.php', cptsFile);
            engineIncludes.file('mco-admin.php', adminFile);
            engineIncludes.file('mco-api.php', fullApi);
            engineIncludes.file('mco-data.php', dataFile);
            engineIncludes.file('mco-shortcodes.php', shortcodesFile);

            // --- 2. SOCIAL POSTER PLUGIN ---
            const socialRoot = zip.folder('mco-social-poster');
            socialRoot.file('mco-social-poster.php', socialMainFile);
            const socialIncludes = socialRoot.folder('includes');
            socialIncludes.file('admin-page.php', socialAdminFile);
            socialIncludes.file('post-handler.php', socialHandlerFile);
            
            const blob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `mco-full-suite-v3.6.0.zip`;
            link.click();

            toast.success('Full Suite Synchronized Successfully!', { id: toastId });
        } catch (error: any) {
            toast.error(`Bundle Error: ${error.message}`, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">System Integration</h1>
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Code size={32} /></div>
                    <div>
                        <h2 className="text-2xl font-bold">MCO Master Suite</h2>
                        <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Complete Bundle: Core API + Social Poster Companion</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-bold flex items-center gap-2 mb-2 text-blue-600"><Code size={18}/> Core Engine</h3>
                        <p className="text-xs text-slate-500">1300+ lines of robust API logic, JWT security, and WooCommerce deep-sync.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-bold flex items-center gap-2 mb-2 text-purple-600"><Share2 size={18}/> Social Poster</h3>
                        <p className="text-xs text-slate-500">Auto-shares AI generated posts to FB/LinkedIn via mco_ai_post_created hook.</p>
                    </div>
                </div>

                <button onClick={generateEngineZip} disabled={isGenerating} className="flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {isGenerating ? <Spinner size="sm" /> : <DownloadCloud />} Assemble & Download Plugin Bundle
                </button>
            </div>
        </div>
    );
};

export default Integration;
