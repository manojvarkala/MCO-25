import React, { FC, useState } from 'react';
import { DownloadCloud, Info, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';

const pluginFiles = [
    { source: '/mco-exam-integration-engine/mco-exam-integration-engine.txt', dest: 'mco-exam-integration-engine/mco-exam-integration-engine.php' },
    { source: '/mco-exam-integration-engine/includes/mco-admin.txt', dest: 'mco-exam-integration-engine/includes/mco-admin.php' },
    { source: '/mco-exam-integration-engine/includes/mco-api.txt', dest: 'mco-exam-integration-engine/includes/mco-api.php' },
    { source: '/mco-exam-integration-engine/includes/mco-cpts.txt', dest: 'mco-exam-integration-engine/includes/mco-cpts.php' },
    { source: '/mco-exam-integration-engine/includes/mco-data.txt', dest: 'mco-exam-integration-engine/includes/mco-data.php' },
    { source: '/mco-exam-integration-engine/includes/mco-shortcodes.txt', dest: 'mco-exam-integration-engine/includes/mco-shortcodes.php' },
    { source: '/mco-exam-integration-engine/assets/mco-styles.txt', dest: 'mco-exam-integration-engine/assets/mco-styles.css' },
];

const Integration: FC = () => {
    const [isZipping, setIsZipping] = useState(false);

    const handleGenerateAndDownloadZip = async () => {
        setIsZipping(true);
        const toastId = toast.loading('Preparing plugin files...');

        try {
            const zip = new JSZip();
            const filePromises = pluginFiles.map(file =>
                fetch(file.source).then(res => {
                    if (!res.ok) throw new Error(`Failed to fetch ${file.source}`);
                    return res.text();
                })
            );

            const fileContents = await Promise.all(filePromises);

            fileContents.forEach((content, index) => {
                const file = pluginFiles[index];
                zip.file(file.dest, content);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'mco-exam-integration-engine.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast.success('Plugin .zip file generated!', { id: toastId });
        } catch (error: any) {
            console.error('Failed to generate zip:', error);
            toast.error(error.message || 'Failed to generate plugin zip.', { id: toastId });
        } finally {
            setIsZipping(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">WordPress Integration Plugin</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                <h2 className="text-xl font-bold mb-2 text-slate-800">The Integration Engine (v30.2.4)</h2>
                <p className="mb-4 text-slate-600">
                    This is the master plugin for integrating the exam app with your WordPress site. It handles Single Sign-On (SSO), data synchronization, CORS headers, and provides powerful shortcodes for displaying content.
                </p>
                <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 my-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Info className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-cyan-700">
                                This tool dynamically generates a ready-to-install <code>.zip</code> file for you, eliminating the need for manual file renaming.
                            </p>
                        </div>
                    </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-700 mt-6">Installation Instructions:</h3>
                <ol className="list-decimal pl-5 space-y-3 mt-2 text-slate-600">
                    <li>
                        Click the <strong>"Generate & Download Plugin"</strong> button below. Your browser will prepare and download the <code>mco-exam-integration-engine.zip</code> file.
                    </li>
                    <li>
                        In your WordPress admin dashboard, navigate to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>.
                    </li>
                    <li>
                        Choose the <code>.zip</code> file you just downloaded and click "Install Now".
                    </li>
                     <li>
                        Activate the plugin after installation.
                    </li>
                     <li>
                        Navigate to the new <strong>"Exam App Engine"</strong> menu in your WordPress admin sidebar to configure the required settings, such as your Exam App URL.
                    </li>
                </ol>

                <h3 className="text-lg font-semibold text-slate-700 mt-8">Updating the Plugin:</h3>
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-blue-800">
                    <div className="flex items-start gap-3">
                        <Info className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div>
                            <strong className="font-bold">RECOMMENDED UPDATE METHOD</strong>
                            <ol className="list-decimal pl-5 mt-2 text-sm space-y-1">
                                <li>Download the new plugin version using the button below.</li>
                                <li>In WordPress, go to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>.</li>
                                <li>Choose the new <code>.zip</code> file.</li>
                                <li>WordPress should detect the existing plugin and ask you to <strong>"Replace current with uploaded"</strong>. Click this button to upgrade.</li>
                                <li>Activate the plugin if prompted.</li>
                                <li>Finally, <strong>clear all caches</strong> on your site (e.g., WP Rocket, server cache) to ensure all changes take effect.</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div className="mt-4 bg-amber-50 p-4 rounded-md border border-amber-200 text-amber-800">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                        <div>
                            <strong className="font-bold">TROUBLESHOOTING: PLUGIN INSTALLED SEPARATELY?</strong>
                            <p className="text-sm mt-1">
                                If WordPress installs the update as a <strong>new, separate plugin</strong> instead of offering to replace it, it's a minor issue. It means the folder name from a previous version was different.
                            </p>
                            <p className="text-sm mt-2">
                                <strong>To fix this:</strong> Go to your Plugins page, find the two "Exam App Integration Engine" plugins, and <strong>deactivate and delete the OLDER version</strong>. The plugin is designed to prevent errors if both are active, but it's important to clean up duplicates.
                            </p>
                        </div>
                    </div>
                </div>


                 <div className="mt-8 text-center">
                    <button 
                        onClick={handleGenerateAndDownloadZip}
                        disabled={isZipping}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        {isZipping ? <Spinner size="sm" /> : <DownloadCloud size={20} className="mr-2" />}
                        {isZipping ? 'Generating...' : 'Generate & Download Plugin (.zip) v30.2.4'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Integration;