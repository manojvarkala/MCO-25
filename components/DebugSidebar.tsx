import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { DebugData } from '../types.ts';
import { Bug, X, Server } from 'lucide-react';
import Spinner from './Spinner.tsx';

const DebugSidebar: React.FC = () => {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugData, setDebugData] = useState<DebugData | null>(null);

    useEffect(() => {
        if (isOpen && !debugData && token) {
            const fetchDebugData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await googleSheetsService.getDebugDetails(token);
                    setDebugData(data);
                } catch (err: any) {
                    setError(err.message || 'Failed to fetch debug data.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDebugData();
        }
    }, [isOpen, debugData, token]);

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
                className={`fixed top-0 right-0 h-full bg-slate-800 text-white shadow-2xl transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
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
                            <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(debugData, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
            {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 z-30 transition-opacity"></div>}
        </>
    );
};

export default DebugSidebar;