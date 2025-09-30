

import React, { FC } from 'react';
import { DownloadCloud, Info, AlertTriangle } from 'lucide-react';

const Integration: FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-800">WordPress Integration Plugin</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                <h2 className="text-xl font-bold mb-2 text-slate-800">The Integration Engine (v30.1.0)</h2>
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
                                The plugin files are located inside the <strong>`mco-exam-integration-engine`</strong> folder within this project's source code. You will need to prepare these files before uploading.
                            </p>
                        </div>
                    </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-700 mt-6">Installation Instructions:</h3>
                <ol className="list-decimal pl-5 space-y-3 mt-2 text-slate-600">
                    <li>
                        Locate the <strong>`mco-exam-integration-engine`</strong> directory in the source files of this application.
                    </li>
                    <li className="bg-amber-50 p-3 rounded-md border border-amber-200">
                        <strong className="text-amber-800">Crucial Step: Rename Files</strong><br />
                        Before zipping, you must rename the files from <code>.txt</code> to their correct extensions for WordPress to recognize them.
                        <ul className="list-disc pl-5 mt-2 text-sm">
                            <li>The main file <code>mco-exam-integration-engine.txt</code> must be renamed to <strong><code>mco-exam-integration-engine.php</code></strong>.</li>
                            <li>In the <code>/includes/</code> folder, rename all <code>.txt</code> files to <strong><code>.php</code></strong>.</li>
                            <li>In the <code>/assets/</code> folder, rename <code>mco-styles.txt</code> to <strong><code>mco-styles.css</code></strong>.</li>
                        </ul>
                    </li>
                    <li>
                        After renaming, create a <strong>.zip</strong> file of the entire <strong>`mco-exam-integration-engine`</strong> directory.
                    </li>
                    <li>
                        In your WordPress admin dashboard, navigate to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>.
                    </li>
                    <li>
                        Choose the .zip file you just created and click "Install Now".
                    </li>
                     <li>
                        Activate the plugin after installation.
                    </li>
                     <li>
                        Navigate to the new <strong>"Exam App Engine"</strong> menu in your WordPress admin sidebar to configure the required settings, such as your Exam App URL.
                    </li>
                </ol>

                <h3 className="text-lg font-semibold text-slate-700 mt-8">Updating the Plugin:</h3>
                <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-800">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                            <strong className="font-bold">IMPORTANT UPDATE PROCEDURE</strong>
                            <p className="text-sm mt-1">To prevent "Cannot redeclare function" errors, you must deactivate and delete the old plugin before uploading the new version. Your settings will be preserved.</p>
                            <ol className="list-decimal pl-5 mt-2 text-sm space-y-1">
                                <li>In WordPress, go to <strong>Plugins</strong>.</li>
                                <li><strong>Deactivate</strong> the "Exam App Integration Engine" plugin.</li>
                                <li><strong>Delete</strong> the plugin.</li>
                                <li>Follow the installation steps above to upload the new <code>.zip</code> file and activate it.</li>
                            </ol>
                        </div>
                    </div>
                </div>

                 <div className="mt-8 text-center">
                    <a 
                        href="/mco-exam-integration-engine.zip" 
                        download
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105"
                    >
                        <DownloadCloud size={20} className="mr-2" />
                        Download Plugin (.zip) v30.1.0
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Integration;