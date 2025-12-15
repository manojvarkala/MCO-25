
import React, { FC, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { DebugData } from '../types.ts';
import { Bug, X, Server, User, ShoppingCart, FileText, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';

interface DebugSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebugSidebar: FC<DebugSidebarProps> = ({ isOpen, onClose }) => {
    const { token, logout } = useAuth();
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
    
    // CASE 1: Server stripping header (401 / Missing Token)
    const isMissingHeaderError = error && (
        error.toLowerCase().includes('jwt_auth_missing_token') || 
        error.toLowerCase().includes('authorization header missing')
    );

    // CASE 2: Token mismatch / Secret Key issue (403 / Invalid Token)
    const isInvalidTokenError = error && (
        error.toLowerCase().includes('invalid or expired token') ||
        error.toLowerCase().includes('jwt_auth_invalid_token')
    );
    
    // CASE 3: Generic connection issues
    const isConnectionError = error && (
        error.toLowerCase().includes('could not connect') || 
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
                                    <p className="font-bold text-red-400">Status: Error</p>
                                </div>
                                <p className="text-xs text-slate-400 mb-2">Endpoint: <code className="bg-slate-700 p-1 rounded">{`${apiUrl}/wp-json/mco-app/v1/debug-details`}</code></p>
                                <p className="text-sm break-all"><strong>Error:</strong> {error}</p>
                                
                                <div className="mt-4 p-3 bg-slate-700 rounded border border-amber-400/50 text-amber-200 text-xs">
                                    {isMissingHeaderError && (
                                        <>
                                            <h4 className="font-bold text-amber-300 mb-2 text-base">🔴 SERVER CONFIG ISSUE</h4>
                                            <p className="mb-2">Your server is stripping the <code>Authorization</code> header. The fix is in your <code>.htaccess</code> file.</p>
                                            
                                            <h4 className="font-bold text-white mt-4 mb-1">Required .htaccess Rule:</h4>
                                            <p className="mb-2">Add this to the very top of your <code>.htaccess</code> file, BEFORE any other rules:</p>
                                            <div className="bg-slate-900 p-2 rounded my-2 text-cyan-300 select-all">
                                                <pre className="whitespace-pre-wrap"><code>
{`<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>`}
                                                </code></pre>
                                            </div>
                                        </>
                                    )}

                                    {isInvalidTokenError && (
                                        <>
                                            <h4 className="font-bold text-amber-300 mb-2 text-base">🔑 TOKEN MISMATCH</h4>
                                            <p className="mb-3">The token stored in your browser was signed with a different Secret Key than the one currently in your WordPress <code>wp-config.php</code>.</p>
                                            
                                            <p className="mb-3">This happens if you changed the <code>MCO_JWT_SECRET</code> after logging in, or migrated the database.</p>

                                            <button 
                                                onClick={logout}
                                                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center justify-center gap-2 transition"
                                            >
                                                <LogOut size={16} /> Log Out & Clear Token
                                            </button>
                                            <p className="mt-2 text-center opacity-75">After logging out, log back in to generate a fresh, valid token.</p>
                                        </>
                                    )}

                                    {!isMissingHeaderError && !isInvalidTokenError && (
                                        <>
                                            <h4 className="font-bold text-amber-300 mb-2">Troubleshooting Guide</h4>
                                            <ul className="list-disc list-inside my-2 space-y-2">
                                                <li>Check if your WordPress site is online.</li>
                                                <li>Ensure the <strong>Exam App Engine</strong> plugin is active.</li>
                                                <li>Verify CORS settings in <strong>WP Admin &rarr; Exam App Engine</strong>.</li>
                                            </ul>
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
