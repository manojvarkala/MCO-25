import React, { FC, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { DebugData } from '../types.ts';
import { Bug, X, Server, User, ShoppingCart, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';

const DebugSidebar: FC = () => {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugData, setDebugData] = useState<DebugData | null>(null);

    useEffect(() => {
        if (!isOpen || !token) {
            setDebugData(null);
            setError(null);
            return;
        }

        let isCancelled = false;

        const fetchDebugData = async () => {
            setIsLoading(true);
            setError(null);
            setDebugData(null);
            try {
                const data = await googleSheetsService.getDebugDetails(token);
                if (!isCancelled) {
                    setDebugData(data);
                }
            } catch (err: any) {
                if (!isCancelled) {
                    setError(err.message || 'Failed to fetch debug data.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchDebugData();

        return () => {
            isCancelled = true;
            setIsLoading(false);
            setError(null);
        };
    }, [isOpen, token]);

    const Section: FC<{ title: string; icon: ReactNode; children: ReactNode }> = ({ title, icon, children }) => (
        <div className="mb-4">
            <h3 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center gap-2 border-b border-slate-700 pb-1">
                {icon} {title}
            </h3>
            <div className="text-slate-300 text-sm">{children}</div>
        </div>
    );
    
    const currentAppUrl = window.location.origin;
    const apiUrl = getApiBaseUrl();
    const isAuthError = error && (error.toLowerCase().includes('jwt_auth_missing_token') || error.toLowerCase().includes('authorization header missing'));

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 z-50 transition-transform transform hover:scale-110"
                aria-label="Toggle Debug Sidebar"
            >
                <Bug size={24} />
            </button>

            <div 
                className={`absolute top-0 right-0 h-full bg-slate-800 text-white shadow-2xl transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ width: 'min(90vw, 500px)' }}
            >
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Server /> Admin Debug Info
                        </h2>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-slate-700">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-grow bg-slate-900 rounded-lg p-4 overflow-auto font-mono text-sm">
                        {isLoading && (
                            <div className="flex items-center justify-center h-full">
                                <Spinner />
                            </div>
                        )}
                        {error && (
                            <Section title="Backend API Status" icon={<AlertTriangle size={16} className="text-red-400" />}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <p className="font-bold text-red-400">Status: Connection Failed</p>
                                </div>
                                <p className="text-xs text-slate-400 mb-2">Could not connect to the API at: <code className="bg-slate-700 p-1 rounded">{`${apiUrl}/wp-json/mco-app/v1/debug-details`}</code></p>
                                <p className="text-sm"><strong>Error:</strong> {error}</p>
                                
                                <div className="mt-4 p-3 bg-slate-700 rounded border border-amber-400/50 text-amber-200 text-xs">
                                    {isAuthError ? (
                                        <>
                                            <h4 className="font-bold text-amber-300 mb-2 text-base">Primary Solution (Apache Servers)</h4>
                                            <p className="mb-2">This error almost always means your Apache server is stripping the "Authorization" header from API requests.</p>
                                            <ol className="list-decimal list-inside my-2 space-y-3">
                                                <li>
                                                    <strong className="text-white">Update .htaccess file</strong><br/>
                                                    Add the following code to the <strong>very top</strong> of your <code>.htaccess</code> file in the WordPress root directory (before the <code># BEGIN WordPress</code> block):
                                                    <div className="bg-slate-900 p-2 rounded my-2 text-cyan-300">
                                                        <pre className="whitespace-pre-wrap"><code>
{`<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>`}
                                                        </code></pre>
                                                    </div>
                                                    After adding this, clear any server or plugin caches.
                                                </li>
                                            </ol>
                                            
                                            <h4 className="font-bold text-amber-300 mt-6 mb-2 text-base border-t border-amber-400/30 pt-4">If the Primary Solution Fails...</h4>
                                            <p className="mb-2">If the <code>.htaccess</code> fix didn't work, one of these is likely the cause:</p>
                                            <ol className="list-decimal list-inside my-2 space-y-4">
                                                <li>
                                                    <strong className="text-white">Multi-Domain Setup: Is your app on Vercel or another temporary URL?</strong><br/>
                                                    If you access the app from multiple URLs (e.g., <code>exam.coding-online.net</code> AND <code>mco-25.vercel.app</code>), you must add <strong>ALL</strong> of them to the plugin settings. In WordPress, go to <strong className="text-white">Exam App Engine &rarr; Main Settings</strong> and add each URL to the "Exam Application URL(s)" box, each on a new line.
                                                </li>
                                                <li>
                                                    <strong className="text-white">Are you using an Nginx server?</strong><br/>
                                                    The <code>.htaccess</code> file is for Apache servers only. If your host uses Nginx, you must add the following to your site's Nginx configuration file (you may need to ask your host for help):
                                                    <div className="bg-slate-900 p-2 rounded my-2 text-cyan-300">
                                                        <pre className="whitespace-pre-wrap"><code>
{`location ~ \\.php$ {
    # ... your existing rules ...
    fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    fastcgi_param HTTP_AUTHORIZATION $http_authorization; # Add this line
    fastcgi_read_timeout 300;
}`}
                                                        </code></pre>
                                                    </div>
                                                    The key is the <code>fastcgi_param HTTP_AUTHORIZATION $http_authorization;</code> line inside your PHP location block.
                                                </li>
                                                <li>
                                                    <strong className="text-white">Contact Your Hosting Provider</strong><br/>
                                                    Some hosting environments have security rules you cannot override. Contact their support and specifically ask them to: <strong className="text-amber-200">"Please ensure that the HTTP Authorization header is being passed through to WordPress PHP scripts for the REST API."</strong>
                                                </li>
                                            </ol>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="font-bold text-amber-300 mb-2">Troubleshooting Guide</h4>
                                            <ol className="list-decimal list-inside my-2 space-y-3">
                                                <li>
                                                    <strong>CORS Setting:</strong> In your WordPress admin, go to <strong className="text-white">Exam App Engine &rarr; Main Settings</strong> and ensure the "Exam Application URL(s)" field contains your app's URL, exactly:
                                                    <div className="bg-slate-900 p-2 rounded text-center my-2 text-cyan-300"><code>{currentAppUrl}</code></div>
                                                </li>
                                                <li>
                                                    <strong>Plugin Conflict:</strong> A security plugin (like Wordfence) or a caching plugin might be blocking API requests. Try temporarily disabling them.
                                                </li>
                                                <li>
                                                    <strong>Full Diagnosis:</strong> For more detailed diagnostics, go to the <strong className="text-white">Admin Panel</strong> and use the "System Health Check" tool.
                                                </li>
                                            </ol>
                                        </>
                                    )}
                                </div>
                            </Section>
                        )}
                        {debugData && (
                            <div>
                                <Section title="Backend API & Data Status" icon={<CheckCircle size={16} className="text-green-400" />}>
                                    <p className="text-green-400"><strong>API Connection:</strong> Success</p>
                                    <p className={debugData?.sheetTest?.success ? 'text-green-400' : 'text-red-400'}>
                                        <strong>Question Sheet:</strong> {debugData?.sheetTest?.success ? 'Accessible' : 'Failure'}
                                    </p>
                                    <p><strong>Sheet Message:</strong> {debugData?.sheetTest?.message ?? 'N/A'}</p>
                                </Section>

                                <Section title="User Details" icon={<User size={16} />}>
                                    <p><strong>ID:</strong> {debugData?.user?.id ?? 'N/A'}</p>
                                    <p><strong>Name:</strong> {debugData?.user?.name ?? 'N/A'}</p>
                                    <p><strong>Email:</strong> {debugData?.user?.email ?? 'N/A'}</p>
                                </Section>

                                <Section title="Purchased Exam SKUs" icon={<ShoppingCart size={16} />}>
                                    {debugData?.purchases?.length > 0 ? (
                                        <ul className="list-disc pl-5">
                                            {debugData.purchases.map(sku => <li key={sku}>{sku}</li>)}
                                        </ul>
                                    ) : <p>No purchases found.</p>}
                                </Section>
                                
                                <Section title="Synced Exam Results" icon={<FileText size={16} />}>
                                    {debugData?.results?.length > 0 ? (
                                        <div className="space-y-2">
                                            {debugData.results.map(result => (
                                                <div key={result.testId} className="bg-slate-800 p-2 rounded">
                                                    <p><strong>Test ID:</strong> {result.testId}</p>
                                                    <p><strong>Exam ID:</strong> {result.examId}</p>
                                                    <p><strong>Score:</strong> {result.score}%</p>
                                                    <p><strong>Date:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p>No results synced.</p>}
                                </Section>

                                 {debugData?.sheetTest?.data && (
                                     <Section title="Raw Sheet Test Data" icon={<FileText size={16} />}>
                                        <pre className="text-xs bg-slate-800 p-2 rounded mt-1 whitespace-pre-wrap break-all">
                                            {JSON.stringify(debugData.sheetTest.data, null, 2)}
                                        </pre>
                                    </Section>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isOpen && <div onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/50 z-30 transition-opacity"></div>}
        </>
    );
};

export default DebugSidebar;