import React, { FC, useState, useEffect, useCallback, ReactNode } from 'react';
import { Settings, ExternalLink, Edit, Save, X, Book, FileSpreadsheet, Award, Type, Lightbulb, Users, Gift, PlusCircle, Trash2, RotateCcw, Search, UserCheck, Paintbrush, ShoppingCart, Code, BarChart3, RefreshCw, FileText, Percent, BadgeCheck, BadgeX, BarChart, TrendingUp, Cpu, Video, DownloadCloud, Loader, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import type { Exam, SearchedUser, ExamStat } from '../types.ts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { getApiBaseUrl } from '../services/apiConfig.ts';

const prizeOptions = [
    { id: 'SUB_YEARLY', label: 'Annual Subscription' },
    { id: 'SUB_MONTHLY', label: 'Monthly Subscription' },
    { id: 'SUB_WEEKLY', label: 'Weekly Subscription' },
    { id: 'EXAM_CPC', label: 'Free CPC Exam' },
    { id: 'EXAM_CCA', label: 'Free CCA Exam' },
];

// FIX: Define a union type for health status to ensure type safety.
type HealthStatus = 'idle' | 'success' | 'failed' | 'loading';

interface HealthCheckItemProps {
    status: HealthStatus;
    title: string;
    message: string | ReactNode;
    troubleshooting?: ReactNode;
}

interface HealthCheckState {
    connectivity: { status: HealthStatus; message: ReactNode };
    apiEndpoint: { status: HealthStatus; message: ReactNode };
    authentication: { status: HealthStatus; message: ReactNode };
}

const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return text;
    }
};

const HealthCheckItem: FC<HealthCheckItemProps> = ({ status, title, message, troubleshooting }) => {
    const StatusIcon = {
        idle: <div className="w-5 h-5 bg-slate-300 rounded-full flex-shrink-0" />,
        loading: <Loader size={20} className="text-blue-500 animate-spin flex-shrink-0" />,
        success: <CheckCircle size={20} className="text-green-500 flex-shrink-0" />,
        failed: <XCircle size={20} className="text-red-500 flex-shrink-0" />,
    }[status];

    const statusColorClass = {
        idle: 'text-slate-500',
        loading: 'text-blue-600',
        success: 'text-green-600',
        failed: 'text-red-600',
    }[status];

    return (
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            {StatusIcon}
            <div className="flex-grow">
                <h4 className={`font-bold ${statusColorClass}`}>{title}</h4>
                <div className="text-sm text-slate-600">{message}</div>
                {status === 'failed' && troubleshooting && (
                    <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
                        <h5 className="font-bold mb-1">Troubleshooting Tip</h5>
                        {troubleshooting}
                    </div>
                )}
            </div>
        </div>
    );
};

const Admin: FC = () => {
    const { activeOrg, updateActiveOrg } = useAppContext();
    const { token } = useAuth();

    // State for user prize management
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);

    const [spinsToAdd, setSpinsToAdd] = useState('1');
    const [prizeToGrant, setPrizeToGrant] = useState(prizeOptions[0].id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for exam stats
    const [stats, setStats] = useState<ExamStat[] | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);
    
    // State for config download & cache clear
    const [isDownloadingConfig, setIsDownloadingConfig] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);
    
    // State for health check
    const [healthCheckStatus, setHealthCheckStatus] = useState<HealthCheckState>({
        connectivity: { status: 'idle', message: '' },
        apiEndpoint: { status: 'idle', message: '' },
        authentication: { status: 'idle', message: '' },
    });
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    const certificateTemplates = activeOrg?.certificateTemplates || [];


    const fetchStats = useCallback(async () => {
        if (!token) return;
        setIsLoadingStats(true);
        setStatsError(null);
        try {
            const data = await googleSheetsService.getExamStats(token);
            if (data && Array.isArray(data)) {
                data.forEach(stat => {
                    stat.examName = decodeHtmlEntities(stat.examName);
                });
            }
            setStats(data);
        } catch (error: any) {
            setStatsError(error.message || 'Failed to load statistics.');
        } finally {
            setIsLoadingStats(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleRunHealthCheck = async () => {
        setIsCheckingHealth(true);
        const baseUrl = getApiBaseUrl();
        const initialStatus: HealthCheckState = {
            connectivity: { status: 'loading', message: 'Pinging server...' },
            apiEndpoint: { status: 'idle', message: '' },
            authentication: { status: 'idle', message: '' },
        };
        // FIX: Remove 'as any' and use strongly typed state to resolve assignment errors.
        setHealthCheckStatus(initialStatus);
    
        // Check 1: Basic Connectivity
        try {
            const response = await fetch(`${baseUrl}/wp-json/`);
            if (!response.ok) throw new Error(`Server responded with HTTP status ${response.status}`);
            setHealthCheckStatus(prev => ({ ...prev, connectivity: { status: 'success', message: <>Server is reachable at <code className="bg-slate-200 px-1 rounded">{baseUrl}</code></> } }));
    
            // Check 2: API Endpoint
            // FIX: This update is now type-safe due to the strongly typed state.
            setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'loading', message: 'Checking for plugin API...' } }));
            try {
                const apiResponse = await fetch(`${baseUrl}/wp-json/mco-app/v1/config`);
                if (!apiResponse.ok) throw new Error(`Server responded with HTTP status ${apiResponse.status}`);
                setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'success', message: 'Plugin API endpoint is active.' } }));
    
                // Check 3: Authentication
                // FIX: This update is now type-safe due to the strongly typed state.
                setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'loading', message: 'Testing authentication...' } }));
                try {
                    if (!token) throw new Error('No admin token available in the app.');
                    await googleSheetsService.getDebugDetails(token);
                    setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'success', message: 'Authentication and CORS are correctly configured.' } }));
                } catch (authError: any) {
                    setHealthCheckStatus(prev => ({ ...prev, authentication: { status: 'failed', message: authError.message } }));
                }
    
            } catch (apiError: any) {
                setHealthCheckStatus(prev => ({ ...prev, apiEndpoint: { status: 'failed', message: apiError.message }, authentication: { status: 'idle', message: '' } }));
            }
    
        } catch (connError: any) {
            setHealthCheckStatus(prev => ({
                ...prev,
                connectivity: { status: 'failed', message: connError.message },
                apiEndpoint: { status: 'idle', message: '' },
            }));
        } finally {
            setIsCheckingHealth(false);
        }
    };

    const handleUserSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !searchTerm.trim()) return;
        setIsSearching(true);
        setSelectedUser(null);
        try {
            const results = await googleSheetsService.searchUser(token, searchTerm.trim());
            if (results && Array.isArray(results)) {
                results.forEach(user => {
                    user.name = decodeHtmlEntities(user.name);
                });
            }
            setSearchResults(results);
            if(results.length === 0) toast.error('No users found matching that term.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to search for users.');
        } finally {
            setIsSearching(false);
        }
    }

    const handleAddSpins = async () => {
        if (!token || !selectedUser) return;
        setIsSubmitting(true);
        try {
            const spins = parseInt(spinsToAdd);
            if (isNaN(spins) || spins <= 0) { toast.error("Please enter a valid number of spins."); return; }
            await googleSheetsService.addSpins(token, selectedUser.id, spins);
            toast.success(`Successfully added ${spins} spin(s) to ${selectedUser.name}.`);
            setSpinsToAdd('1');
        } catch (error: any) { toast.error(error.message || "Failed to add spins."); } finally { setIsSubmitting(false); }
    };

    const handleGrantPrize = async () => {
        if (!token || !selectedUser) return;
         setIsSubmitting(true);
        try {
            await googleSheetsService.grantPrize(token, selectedUser.id, prizeToGrant);
            toast.success(`Successfully granted prize to ${selectedUser.name}.`);
        } catch (error: any) { toast.error(error.message || "Failed to grant prize."); } finally { setIsSubmitting(false); }
    };

    const handleResetSpins = async () => {
        if (!token || !selectedUser) return;
        if (!window.confirm(`Are you sure you want to reset all available spins for ${selectedUser.name} to zero?`)) return;
        setIsSubmitting(true);
        try {
            await googleSheetsService.resetSpins(token, selectedUser.id);
            toast.success(`Spins for ${selectedUser.name} have been reset to 0.`);
        } catch (error: any) { toast.error(error.message || "Failed to reset spins."); } finally { setIsSubmitting(false); }
    }

    const handleRemovePrize = async () => {
        if (!token || !selectedUser) return;
        if (!window.confirm(`Are you sure you want to remove the won prize and any associated benefits for ${selectedUser.name}? This cannot be undone.`)) return;
        setIsSubmitting(true);
        try {
            await googleSheetsService.removePrize(token, selectedUser.id);
            toast.success(`Prize removed for ${selectedUser.name}.`);
        } catch (error: any) { toast.error(error.message || "Failed to remove prize."); } finally { setIsSubmitting(false); }
    }
    
    const handleDownloadConfig = async () => {
        setIsDownloadingConfig(true);
        const toastId = toast.loading('Downloading configuration...');
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/wp-json/mco-app/v1/config`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch config: ${response.statusText}` }));
                throw new Error(errorData.message || `Failed to fetch config: ${response.statusText}`);
            }
            const configData = await response.json();
            const jsonString = JSON.stringify(configData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${configData.organizations[0]?.website.replace(/\..+$/, '') || 'config'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Configuration downloaded!', { id: toastId });
        } catch (error: any) {
            console.error('Download failed:', error);
            toast.error(`Download failed: ${error.message}`, { id: toastId });
        } finally {
            setIsDownloadingConfig(false);
        }
    };

    const handleClearClientCache = () => {
        if (!window.confirm('Are you sure you want to clear the client-side configuration cache? The app will reload to fetch the latest data from the server.')) {
            return;
        }
        setIsClearingCache(true);
        const toastId = toast.loading('Clearing client cache...');

        setTimeout(() => {
            try {
                localStorage.removeItem('appConfigCache');
                localStorage.removeItem('activeOrgId');
                toast.success('Client cache cleared. Reloading application...', { id: toastId });
                setTimeout(() => window.location.reload(), 1000);
            } catch (e) {
                console.error("Failed to clear client cache", e);
                toast.error('Failed to clear client cache.', { id: toastId });
                setIsClearingCache(false);
            }
        }, 500);
    };


    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Admin Panel</h1>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Code className="mr-3 text-cyan-500" />
                    WordPress Integration & Data
                </h2>
                <p className="text-slate-600 mb-6">
                    Manage the connection to your WordPress backend. Use these tools for debugging and content management. The "Live Config" is the exact JSON data the app is using. "Clear Client Cache" forces the app to reload this data from your server.
                </p>
                <div className="flex flex-wrap gap-4">
                    <a
                        href="/#/integration"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105"
                    >
                        <ExternalLink size={20} className="mr-2" />
                        Get Unified Plugin Code
                    </a>
                    <button
                        onClick={handleDownloadConfig}
                        disabled={isDownloadingConfig}
                        className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-base font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        {isDownloadingConfig ? <Spinner size="sm" /> : <DownloadCloud size={20} />}
                        <span className="ml-2">{isDownloadingConfig ? 'Downloading...' : 'Download Live Config (.json)'}</span>
                    </button>
                    <button
                        onClick={handleClearClientCache}
                        disabled={isClearingCache}
                        className="inline-flex items-center justify-center px-6 py-3 border border-amber-300 text-base font-medium rounded-md shadow-sm text-amber-700 bg-amber-100 hover:bg-amber-200 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        {isClearingCache ? <Spinner size="sm" /> : <RotateCcw size={20} />}
                        <span className="ml-2">{isClearingCache ? 'Clearing...' : 'Clear Client Cache & Reload'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <FileSpreadsheet className="mr-3 text-cyan-500" />
                    Bulk Data Management (CSV Upload)
                </h2>
                <p className="text-slate-600 mb-6">
                    To create or update many Exam Programs or Recommended Books at once, use the CSV bulk import tools. This functionality is located in your WordPress admin dashboard for security and direct server-side processing.
                </p>
                <a
                    href={`${getApiBaseUrl()}/wp-admin/admin.php?page=mco-exam-engine&tab=bulk_import`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105"
                >
                    <ExternalLink size={20} className="mr-2" />
                    Go to WordPress Bulk Import
                </a>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Award className="mr-3 text-cyan-500" />
                    Certificate Templates Overview
                </h2>
                <p className="text-slate-600 mb-6">
                    This is a read-only overview of the certificate templates configured in your WordPress backend. To edit these, go to <strong>Exam App Engine &rarr; Certificate Templates</strong> in your WP admin dashboard.
                </p>
                {/* FIX: Complete truncated JSX and add default export to the component. */}
                <div className="space-y-4 max-h-96 overflow-y-auto pr-4">
                    {certificateTemplates.map(template => (
                        <div key={template.id} className="bg-slate-100 p-3 rounded-md border border-slate-200">
                            <p className="font-semibold text-slate-800">{template.name || `ID: ${template.id}`}</p>
                            <p className="text-xs text-slate-600 truncate" title={template.title}>Title: "{template.title}"</p>
                        </div>
                    ))}
                    {certificateTemplates.length === 0 && (
                        <p className="text-slate-500 text-center py-4">No certificate templates found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Admin;