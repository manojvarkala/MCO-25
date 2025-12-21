
import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { DownloadCloud, Code } from 'lucide-react';
import Spinner from './Spinner.tsx';

// Core Imports
import mainPluginFile from '../mco-exam-integration-engine/mco-exam-integration-engine.txt?raw';
import stylesFile from '../mco-exam-integration-engine/assets/mco-styles.txt?raw';
import cptsFile from '../mco-exam-integration-engine/includes/mco-cpts.txt?raw';
import adminFile from '../mco-exam-integration-engine/includes/mco-admin.txt?raw';
import dataFile from '../mco-exam-integration-engine/includes/mco-data.txt?raw';
import shortcodesFile from '../mco-exam-integration-engine/includes/mco-shortcodes.txt?raw';

// The 15-Part API Engine
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

import templateExamPrograms from '../public/template-exam-programs.csv?raw';
import templateRecommendedBooks from '../public/template-recommended-books.csv?raw';
import templateQuestions from '../public/template-questions.csv?raw';

const Integration: FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    
    const generateEngineZip = async () => {
        setIsGenerating(true);
        const toastId = toast.loading('Assembling 15-part production engine...');
        try {
            const zip = new JSZip();
            const root = zip.folder('mco-exam-integration-engine');
            if (!root) throw new Error("FS Error");

            root.folder('assets');
            root.folder('includes');
            root.folder('public');
            
            // Seamless concatenation of all 15 modules
            const fullApi = [
                apiP1, apiP2, apiP3, apiP4, apiP5, apiP6, apiP7, apiP8,
                apiP9, apiP10, apiP11, apiP12, apiP13, apiP14, apiP15
            ].join("\n\n");

            const files = {
                'mco-exam-integration-engine.php': mainPluginFile,
                'assets/mco-styles.css': stylesFile,
                'includes/mco-cpts.php': cptsFile,
                'includes/mco-admin.php': adminFile,
                'includes/mco-api.php': fullApi,
                'includes/mco-data.php': dataFile,
                'includes/mco-shortcodes.php': shortcodesFile,
                'public/template-exam-programs.csv': templateExamPrograms,
                'public/template-recommended-books.csv': templateRecommendedBooks,
                'public/template-questions.csv': templateQuestions,
            };

            for (const [path, content] of Object.entries(files)) {
                root.file(path, content);
            }
            
            const blob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `mco-production-engine.zip`;
            link.click();

            toast.success('Production Engine Synchronized!', { id: toastId });
        } catch (error: any) {
            toast.error(`Assembly Error: ${error.message}`, { id: toastId });
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
                        <h2 className="text-2xl font-bold">MCO Master API Engine</h2>
                        <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">15-Module Synchronized Build • Covers all 44 Endpoints</p>
                    </div>
                </div>
                <button onClick={generateEngineZip} disabled={isGenerating} className="flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {isGenerating ? <Spinner size="sm" /> : <DownloadCloud />} Assemble & Download Production ZIP
                </button>
            </div>
        </div>
    );
};

export default Integration;
