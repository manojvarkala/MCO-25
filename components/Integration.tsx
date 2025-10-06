import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { DownloadCloud, Code } from 'lucide-react';
import Spinner from './Spinner.tsx';

const Integration: FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const pluginVersion = "1.0.0";

    const pluginFiles = [
        'mco-exam-integration-engine/plugin-header.txt',
        'mco-exam-integration-engine/mco-exam-integration-engine.txt',
        'mco-exam-integration-engine/includes/mco-cpts.txt',
        'mco-exam-integration-engine/includes/mco-admin.txt',
        'mco-exam-integration-engine/includes/mco-api.txt',
        'mco-exam-integration-engine/includes/mco-data.txt',
        'mco-exam-integration-engine/includes/mco-shortcodes.txt',
        'mco-exam-integration-engine/assets/mco-styles.txt',
    ];

    const generateZip = async () => {
        setIsGenerating(true);
        const toastId = toast.loading('Generating plugin .zip file...');
        try {
            const zip = new JSZip();
            const rootFolderName = 'mco-exam-integration-engine';
            const rootFolder = zip.folder(rootFolderName);

            if (!rootFolder) {
                throw new Error("Could not create root folder in zip.");
            }

            for (const filePath of pluginFiles) {
                const response = await fetch(`/${filePath}`);
                if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
                const content = await response.text();
                
                // Get the path relative to the root folder (e.g., 'includes/mco-cpts.txt')
                let relativePath = filePath.substring(rootFolderName.length + 1);
                
                // Rename files to their correct extensions
                if (relativePath.endsWith('.txt')) {
                    if (relativePath.endsWith('mco-styles.txt')) {
                         relativePath = relativePath.replace('.txt', '.css');
                    } else {
                         relativePath = relativePath.replace('.txt', '.php');
                    }
                }
                
                rootFolder.file(relativePath, content);
            }
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `mco-exam-integration-engine-v${pluginVersion}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast.success('Plugin .zip generated successfully!', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(`Failed to generate .zip: ${error.message}`, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">Plugin Installation Guide</h1>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <Code className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    WordPress Integration Plugin
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    This plugin provides the backend API, user authentication (SSO), and content management for the React-based examination app. Follow these steps to install or update it on your WordPress site.
                </p>

                <div className="space-y-4 p-4 bg-[rgb(var(--color-muted-rgb))] rounded-lg border border-[rgb(var(--color-border-rgb))]">
                     <ol className="list-decimal list-inside space-y-4 text-[rgb(var(--color-text-muted-rgb))]">
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 1: Generate & Download the Plugin</strong><br />
                            Click the button below to generate a ready-to-install <code>.zip</code> file. This process automatically handles all file naming and structuring for you.
                            <div className="flex flex-wrap gap-2 mt-2">
                                 <button
                                    onClick={generateZip}
                                    disabled={isGenerating}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isGenerating ? <Spinner size="sm" /> : <DownloadCloud size={16} className="mr-2"/>}
                                    {isGenerating ? 'Generating...' : `Generate & Download Plugin (v${pluginVersion})`}
                                </button>
                            </div>
                        </li>
                        <li>
                             <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 2: Install or Update in WordPress</strong><br />
                             Go to your WordPress admin dashboard, navigate to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>, and upload the <code>.zip</code> file you just downloaded.
                             <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                 <h4 className="font-bold">Updating the plugin?</h4>
                                 <p>If you already have an older version installed, WordPress will automatically detect it and ask you to "Replace current with uploaded". Click this button to complete the update safely.</p>
                             </div>
                        </li>
                        <li>
                            <strong className="text-[rgb(var(--color-text-strong-rgb))]">Step 3: Activate & Configure</strong><br />
                            After installation, activate the "MCO Exam Integration Engine" plugin. Then, navigate to the new <strong>Exam App Engine</strong> menu in your WordPress admin to configure the Main Settings.
                        </li>
                     </ol>
                </div>
            </div>
        </div>
    );
};

export default Integration;