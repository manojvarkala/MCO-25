
import React, { FC, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { DebugData } from '../types.ts';
import { Bug, X, Server, User, ShoppingCart, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';

interface DebugSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebugSidebar: FC<DebugSidebarProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();
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
    
    // Check for common Auth Header stripping symptoms
    const isAuthError = error && (
        error.toLowerCase().includes('jwt_auth_missing_token') || 
        error.toLowerCase().includes('authorization header missing') ||
        error.toLowerCase().includes('invalid or expired token') ||
        error.toLowerCase().includes('could not connect') || // CORS failures often mask auth errors
        error.toLowerCase().includes('failed to fetch')
    );

    return (
        <>
            <div 
                className={`fixed top-0 right-0 h-full bg-slate-800 text-white shadow-2xl transition-transform duration-300 ease-in-out z-[60] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ width: 'min(90vw, 500px)' }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="debug-sidebar-title"
            >
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 id="debug-sidebar-title" className="text-2xl font-bold flex items-center gap-2">
                            <Server /> Admin Debug Info
                        </h2>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700" aria-label="Close debug sidebar">
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
                                            <h4 className="font-bold text-amber-300 mb-2 text-base">🔴 REQUIRED SERVER FIX</h4>
                                            <p className="mb-2">Your server is blocking the login token. This is a common security setting on Apache/LiteSpeed servers.</p>
                                            
                                            <h4 className="font-bold text-white mt-4 mb-1">Step 1: Edit .htaccess</h4>
                                            <p className="mb-2">Open the <code>.htaccess</code> file in your WordPress root folder. Add these lines to the very top:</p>
                                            <div className="bg-slate-900 p-2 rounded my-2 text-cyan-300 select-all">
                                                <pre className="whitespace-pre-wrap"><code>
{`<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>`}
                                                </code></pre>
                                            </div>

                                            <h4 className="font-bold text-white mt-4 mb-1">Step 2: Clear Caches</h4>
                                            <p className="mb-2">If you use Cloudflare, WP Rocket, or LiteSpeed Cache, you <strong>must</strong> clear them after making this change.</p>
                                            
                                            <h4 className="font-bold text-white mt-4 mb-1">Step 3: Update Plugin Settings</h4>
                                            <p className="mb-2">Go to <strong>WP Admin &rarr; Exam App Engine</strong>. Ensure "Exam Application URL(s)" includes exactly:</p>
                                            <div className="bg-slate-900 p-2 rounded text-center my-2 text-cyan-300"><code>{currentAppUrl}</code></div>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="font-bold text-amber-300 mb-2">Troubleshooting Guide</h4>
                                            <ol className="list-decimal list-inside my-2 space-y-3">
                                                <li>
                                                    <strong>CORS Setting:</strong> In your WordPress admin, go to <strong className="text-white">Exam App Engine &rarr; Main Settings</strong> and ensure the "Exam Application URL(s)" field contains your app's URL.
                                                </li>
                                                <li>
                                                    <strong>Plugin Conflict:</strong> A security plugin (like Wordfence) might be blocking API requests. Try temporarily disabling it.
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
            {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/50 z-50 transition-opacity"></div>}
        </>
    );
};

export default DebugSidebar;
