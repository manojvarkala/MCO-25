import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { DebugData } from '../types.ts';
import { Bug, X, Server, User, ShoppingCart, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import Spinner from './Spinner.tsx';

const DebugSidebar: React.FC = () => {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugData, setDebugData] = useState<DebugData | null>(null);

    useEffect(() => {
        if (!isOpen || !token) {
            return;
        }

        let isCancelled = false;

        const fetchDebugData = async () => {
            setIsLoading(true);
            setError(null);
            setDebugData(null); // Clear previous data
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
        };
    }, [isOpen, token]);

    const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
        <div className="mb-4">
            <h3 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center gap-2 border-b border-slate-700 pb-1">
                {icon} {title}
            </h3>
            <div className="text-slate-300 text-sm">{children}</div>
        </div>
    );

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
                        {error && <p className="text-red-400">Error: {error}</p>}
                        {debugData && (
                            <div>
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

                                <Section title="Google Sheet Connectivity" icon={debugData?.sheetTest?.success ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}>
                                    <p className={debugData?.sheetTest?.success ? 'text-green-400' : 'text-red-400'}>
                                        <strong>Status:</strong> {debugData?.sheetTest?.success ? 'Success' : 'Failure'}
                                    </p>
                                    <p><strong>Message:</strong> {debugData?.sheetTest?.message ?? 'N/A'}</p>
                                    {debugData?.sheetTest?.data && (
                                        <pre className="text-xs bg-slate-800 p-2 rounded mt-1 whitespace-pre-wrap break-all">
                                            {JSON.stringify(debugData.sheetTest.data, null, 2)}
                                        </pre>
                                    )}
                                </Section>
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