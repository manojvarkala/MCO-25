import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { DownloadCloud, Code } from 'lucide-react';
import Spinner from './Spinner.tsx';

// Import file contents as raw strings using Vite's ?raw feature
// Core Plugin Files
import mainPluginFile from '../mco-exam-integration-engine/mco-exam-integration-engine.txt?raw';
import stylesFile from '../mco-exam-integration-engine/assets/mco-styles.txt?raw';
import cptsFile from '../mco-exam-integration-engine/includes/mco-cpts.txt?raw';
import adminFile from '../mco-exam-integration-engine/includes/mco-admin.txt?raw';
import apiFile from '../mco-exam-integration-engine/includes/mco-api.txt?raw';
import dataFile from '../mco-exam-integration-engine/includes/mco-data.txt?raw';
import shortcodesFile from '../mco-exam-integration-engine/includes/mco-shortcodes.txt?raw';
import templateExamPrograms from '../public/template-exam-programs.csv?raw';
import templateRecommendedBooks from '../public/template-recommended-books.csv?raw';
import templateQuestions from '../public/template-questions.csv?raw';

// Social Poster Plugin Files
import socialPluginMain from '../mco-social-poster/mco-social-poster.txt?raw';
import socialPluginAdmin from '../mco-social-poster/includes/admin-page.txt?raw';
import socialPluginHandler from '../mco-social-poster/includes/post-handler.txt?raw';


const Integration: FC = () => {
    const [isGeneratingEngine, setIsGeneratingEngine] = useState(false);
    const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
    
    const engineVersionMatch = mainPluginFile.match(/Version:\s*([0-9.]+)/);
    const engineVersion = engineVersionMatch ? engineVersionMatch[1] : "2.7.4";
    
    const socialVersionMatch = socialPluginMain.match(/Version:\s*([0-9.]+)/);
    const socialVersion = socialVersionMatch ? socialVersionMatch[1] : "1.0.0";

    const generateEngineZip = async () => {
        setIsGeneratingEngine(true);
        const toastId = toast.loading('Generating core engine .zip file...');
        try {
            const zip = new JSZip();
            const rootFolderName = 'mco-exam-integration-engine';
            
            const rootFolder = zip.folder(rootFolderName);
            if (!rootFolder) throw new Error("Could not create root folder in zip.");

            // Create subfolders
            rootFolder.folder('assets');
            rootFolder.folder('includes');
            rootFolder.folder('public');
            
            // Define all files to be included in the zip with their final names
            const filesToZip = {
                'mco-exam-integration-engine.php': mainPluginFile,
                'assets/mco-styles.css': stylesFile,
                'includes/mco-cpts.php': cptsFile,
                'includes/mco-admin.php': adminFile,
                'includes/mco-api.php': apiFile,
                'includes/mco-data.php': dataFile,
                'includes/mco-shortcodes.php': shortcodesFile,
                'public/template-exam-programs.csv': templateExamPrograms,
                'public/template-recommended-books.csv': templateRecommendedBooks,
                'public/template-questions.csv': templateQuestions,
            };

            for (const path in filesToZip) {
                rootFolder.file(path, filesToZip[path as keyof typeof filesToZip]);
            }
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `mco-exam-integration-engine-v${engineVersion}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast.success('Core engine .zip generated successfully!', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(`Failed to generate .zip: ${error.message}`, { id: toastId });
        } finally {
            setIsGeneratingEngine(false);
        }
    };
    
    const generateSocialPosterZip = async () => {
        setIsGeneratingSocial(true);
        const toastId = toast.loading('Generating social poster .zip file...');
        try {
            const zip = new JSZip();
            const rootFolderName = 'mco-social-poster';
            
            const rootFolder = zip.folder(rootFolderName);
            if (!rootFolder) throw new Error("Could not create root folder in zip.");

            rootFolder.folder('includes');
            
            const filesToZip = {
                'mco-social-poster.php': socialPluginMain,
                'includes/admin-page.php': socialPluginAdmin,
                'includes/post-handler.php': socialPluginHandler,
            };

            for (const path in filesToZip) {
                rootFolder.file(path, filesToZip[path as keyof typeof filesToZip]);
            }
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `mco-social-poster-v${socialVersion}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast.success('Social poster .zip generated successfully!', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(`Failed to generate social poster .zip: ${error.message}`, { id: toastId });
        } finally {
            setIsGeneratingSocial(false);
        }
    };


    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Plugin Installation Guide</h1>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <Code className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Core Exam Engine
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    This is the main plugin that provides the backend API, user authentication (SSO), and content management for the React app.
                </p>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 text-amber-800 text-sm">
                    <p className="font-bold">Important Update (v{engineVersion})</p>
                    <p>We have patched CSS loading issues for guest users and improved login redirection. Please download the latest version and update your WordPress plugin.</p>
                </div>
                <div className="space-y-4 p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                     <ol className="list-decimal list-inside space-y-4 text-[rgb(var(--color-text-muted-rgb))]">
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 1: Generate & Download</strong><br />
                            Click the button below to generate a ready-to-install <code>.zip</code> file.
                             <div className="flex mt-2">
                                 <button
                                    onClick={generateEngineZip}
                                    disabled={isGeneratingEngine}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isGeneratingEngine ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                    {isGeneratingEngine ? 'Generating...' : `Generate & Download Plugin (v${engineVersion})`}
                                </button>
                            </div>
                        </li>
                        <li>
                             <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 2: Install or Update in WordPress</strong><br />
                             Go to your WordPress admin dashboard, navigate to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>, and upload the <code>.zip</code> file. If an older version exists, WordPress will ask if you want to replace it. Choose "Replace current with uploaded".
                        </li>
                     </ol>
                </div>
            </div>

            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <Code className="mr-3 text-cyan-500" />
                    Companion: Social Poster
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    This optional companion plugin connects to the AI Content Engine and automatically shares new blog posts to your social media pages.
                </p>
                <div className="space-y-4 p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                     <ol className="list-decimal list-inside space-y-4 text-[rgb(var(--color-text-muted-rgb))]">
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 1: Generate & Download</strong><br />
                            Click to download the social poster plugin as a <code>.zip</code> file.
                             <div className="flex mt-2">
                                 <button
                                    onClick={generateSocialPosterZip}
                                    disabled={isGeneratingSocial}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isGeneratingSocial ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                    {isGeneratingSocial ? 'Generating...' : `Generate & Download Plugin (v${socialVersion})`}
                                </button>
                            </div>
                        </li>
                        <li>
                             <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 2: Install & Activate in WordPress</strong><br />
                             Just like the core plugin, upload and activate this zip file. A new "Social Poster" menu will appear in your admin dashboard for you to configure.
                        </li>
                     </ol>
                </div>
            </div>

        </div>
    );
};

export default Integration;