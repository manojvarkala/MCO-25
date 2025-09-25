

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

    // State for exam customization
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editedExamData, setEditedExamData] = useState<Partial<Exam>>({});
    
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
    
    // State for config download
    const [isDownloadingConfig, setIsDownloadingConfig] = useState(false);
    
    // State for health check
    const [healthCheckStatus, setHealthCheckStatus] = useState<HealthCheckState>({
        connectivity: { status: 'idle', message: '' },
        apiEndpoint: { status: 'idle', message: '' },
        authentication: { status: 'idle', message: '' },
    });
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);


    const fetchStats = useCallback(async () => {
        if (!token) return;
        setIsLoadingStats(true);
        setStatsError(null);
        try {
            const data = await googleSheetsService.getExamStats(token);
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


    const handleEditClick = (exam: Exam) => {
        setEditingExamId(exam.id);
        setEditedExamData({
            name: exam.name,
            description: exam.description,
            numberOfQuestions: exam.numberOfQuestions,
            passScore: exam.passScore,
            durationMinutes: exam.durationMinutes,
            questionSourceUrl: exam.questionSourceUrl,
            isPractice: exam.isPractice,
            isProctored: exam.isProctored,
            certificateTemplateId: exam.certificateTemplateId,
            recommendedBookId: exam.recommendedBookId || '',
        });
    };

    const handleCancel = () => {
        setEditingExamId(null);
        setEditedExamData({});
    };

    const handleSave = () => {
        if (!activeOrg || !editingExamId) return;

        if (!editedExamData.name?.trim() || !editedExamData.description?.trim()) {
            toast.error("Name and description cannot be empty.");
            return;
        }
        if (isNaN(Number(editedExamData.numberOfQuestions)) || Number(editedExamData.numberOfQuestions) <= 0) {
            toast.error("Number of questions must be a positive number.");
            return;
        }
        if (isNaN(Number(editedExamData.passScore)) || Number(editedExamData.passScore) < 0 || Number(editedExamData.passScore) > 100) {
            toast.error("Pass score must be between 0 and 100.");
            return;
        }
        if (isNaN(Number(editedExamData.durationMinutes)) || Number(editedExamData.durationMinutes) <= 0) {
            toast.error("Duration must be a positive number of minutes.");
            return;
        }
        if (!editedExamData.questionSourceUrl?.trim() || !editedExamData.questionSourceUrl.startsWith('https://docs.google.com/spreadsheets/d/')) {
            toast.error("A valid Google Sheets URL for questions is required.");
            return;
        }

        const updatedExams = activeOrg.exams.map(exam =>
            exam.id === editingExamId ? { ...exam, ...editedExamData } : exam
        );

        const updatedOrg = { ...activeOrg, exams: updatedExams };
        updateActiveOrg(updatedOrg);
        toast.success("Exam updated successfully!");
        handleCancel();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numValue = (name === 'numberOfQuestions' || name === 'passScore' || name === 'durationMinutes') ? parseInt(value) : value;
        setEditedExamData(prev => ({ ...prev, [name]: numValue }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setEditedExamData(prev => ({ ...prev, [name]: checked }));
    };

    const handleUserSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !searchTerm.trim()) return;
        setIsSearching(true);
        setSelectedUser(null);
        try {
            const results = await googleSheetsService.searchUser(token, searchTerm.trim());
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

    const handleSelectExam = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const examId = e.target.value;
        if (examId) {
            const examToEdit = activeOrg?.exams.find(e => e.id === examId);
            if (examToEdit) {
                handleEditClick(examToEdit);
            }
        } else {
            handleCancel();
        }
    };
    
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


    const inputClass = "w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition";
    const labelClass = "block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Admin Panel</h1>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Code className="mr-3 text-cyan-500" />
                    WordPress Integration & Data
                </h2>
                <p className="text-slate-600 mb-6">
                    Manage the connection to your WordPress backend. The "Download Live Config" button below fetches the complete, dynamically-generated JSON configuration from your WordPress API. This file represents the exact data the app is using and is essential for debugging content issues or setting up new tenants.
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
                        {isDownloadingConfig ? <Spinner/> : <DownloadCloud size={20} className="mr-2" />}
                        {isDownloadingConfig ? 'Downloading...' : 'Download Live Config (.json)'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Cpu className="mr-3 text-cyan-500" />
                    System Health Check
                </h2>
                <p className="text-slate-600 mb-6">
                    If you're experiencing connection issues, use this tool to diagnose the problem with your WordPress backend. It will test each part of the connection step-by-step.
                </p>
                <button 
                    onClick={handleRunHealthCheck} 
                    disabled={isCheckingHealth} 
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:bg-slate-400"
                >
                    <RefreshCw size={20} className={`mr-2 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                    {isCheckingHealth ? 'Running Check...' : 'Run Health Check'}
                </button>
                {healthCheckStatus.connectivity.status !== 'idle' && (
                    <div className="mt-6 space-y-3">
                        <HealthCheckItem 
                            status={healthCheckStatus.connectivity.status} 
                            title="1. Server Connectivity" 
                            message={healthCheckStatus.connectivity.message}
                            troubleshooting={
                                <p>The app cannot reach your WordPress server. This could be due to a DNS issue, server downtime, or a firewall blocking all traffic. Please check if your website is online and contact your hosting provider.</p>
                            }
                        />
                         {healthCheckStatus.connectivity.status === 'success' && (
                            <HealthCheckItem 
                                status={healthCheckStatus.apiEndpoint.status} 
                                title="2. Plugin API Endpoint" 
                                message={healthCheckStatus.apiEndpoint.message}
                                troubleshooting={
                                    <p>The server is online, but the plugin's API is not responding. Please ensure the <strong>Exam App Integration Engine</strong> plugin is activated on your WordPress site. If it is, a plugin conflict (e.g., another REST API or security plugin) might be preventing the API routes from registering. Try deactivating other plugins temporarily.</p>
                                }
                            />
                         )}
                         {healthCheckStatus.apiEndpoint.status === 'success' && (
                            <HealthCheckItem 
                                status={healthCheckStatus.authentication.status} 
                                title="3. Authentication & CORS" 
                                message={healthCheckStatus.authentication.message}
                                troubleshooting={
                                    <>
                                        <p>The API is active, but the secure, authenticated request was blocked. Please check the following:</p>
                                        <ol className="list-decimal list-inside space-y-1 mt-2">
                                            <li><strong>CORS Setting:</strong> In WordPress, the 'Exam Application URL' <strong>must</strong> be set exactly to: <code className="bg-amber-200 p-1 rounded">{window.location.origin}</code></li>
                                            <li><strong>Caching:</strong> Clear all caches on your WordPress site (plugin, server, CDN).</li>
                                            <li><strong>Security Plugins:</strong> A security plugin (like Wordfence) might be stripping the 'Authorization' header from requests. Check its logs.</li>
                                            <li><strong>Server Config:</strong> Your server's <code>.htaccess</code> or Nginx config may have rules that block authorization headers. Contact your host for support.</li>
                                        </ol>
                                    </>
                                }
                            />
                         )}
                    </div>
                )}
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <BarChart3 className="mr-3 text-cyan-500" />
                        Exam Statistics
                    </h2>
                    <button onClick={fetchStats} disabled={isLoadingStats} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-200 disabled:text-slate-400">
                        <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
                <p className="text-slate-600 mb-6">
                    Overview of sales and attempts for each certification exam. Data is fetched directly from your WordPress backend.
                </p>
                
                {isLoadingStats ? (
                    <div className="flex justify-center items-center h-48"><Spinner /></div>
                ) : statsError ? (
                    <div className="text-center py-10 text-red-500 bg-red-50 p-4 rounded-lg">
                        <p><strong>Error:</strong> {statsError}</p>
                    </div>
                ) : stats && stats.length > 0 ? (
                     <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Exam Name</th>
                                    <th scope="col" className="px-6 py-3 text-center">Sales</th>
                                    <th scope="col" className="px-6 py-3 text-center">Attempts</th>
                                    <th scope="col" className="px-6 py-3 text-center">Passed</th>
                                    <th scope="col" className="px-6 py-3 text-center">Failed</th>
                                    <th scope="col" className="px-6 py-3 text-center">Pass Rate</th>
                                    <th scope="col" className="px-6 py-3 text-center">Avg. Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat) => {
                                    const examConfig = activeOrg?.exams.find(exam => exam.id === stat.examId);
                                    const passScore = examConfig ? examConfig.passScore : 70;
                                    const passRateColor = stat.passRate >= passScore ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
                                    const avgScoreColor = stat.averageScore >= passScore ? 'text-green-600' : 'text-amber-600';

                                    return (
                                        <tr key={stat.examId} className="bg-white border-b hover:bg-slate-50">
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                                {stat.examName}
                                            </th>
                                            <td className="px-6 py-4 text-center">{stat.totalSales}</td>
                                            <td className="px-6 py-4 text-center">{stat.totalAttempts}</td>
                                            <td className="px-6 py-4 text-center text-green-600 font-medium">{stat.passed}</td>
                                            <td className="px-6 py-4 text-center text-red-600 font-medium">{stat.failed}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${passRateColor}`}>
                                                    {stat.passRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-center font-bold ${avgScoreColor}`}>
                                                {stat.averageScore.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-10">No statistics available.</p>
                )}
            </div>

             <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Users className="mr-3 text-cyan-500" />
                    User Prize Management
                </h2>
                 <fieldset disabled className="opacity-50">
                    <p className="text-slate-600 mb-6">
                        Search for a user by name or email to manage their spins and prizes. (This feature is temporarily unavailable.)
                    </p>

                    <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-4">
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter user name or email..." className={inputClass} />
                        <button type="submit" disabled={true} className="flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                            <Search size={16} />
                        </button>
                    </form>
                 </fieldset>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Book className="mr-3 text-cyan-500" />
                    Exam Customization (Session Only)
                </h2>
                <p className="text-slate-600 mb-6">
                    Select an exam from the dropdown to edit its details. Changes are saved for the current browser session and will reset on a full page reload.
                </p>

                <div className="mb-4">
                    <label htmlFor="exam-select" className={labelClass}>Select Exam to Edit</label>
                    <select
                        id="exam-select"
                        value={editingExamId || ''}
                        onChange={handleSelectExam}
                        className={inputClass}
                    >
                        <option value="">-- Select an Exam --</option>
                        {activeOrg?.exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                        ))}
                    </select>
                </div>

                {editingExamId && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 transition-all duration-300">
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg text-slate-800 mb-2 border-b pb-2">Editing: {editedExamData.name}</h3>
                            <div>
                                <label htmlFor="name" className={labelClass}><Type size={14}/> Exam Name</label>
                                <input type="text" name="name" id="name" value={editedExamData.name} onChange={handleInputChange} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="description" className={labelClass}><Type size={14}/> Description</label>
                                <textarea name="description" id="description" value={editedExamData.description} onChange={handleInputChange} className={inputClass} rows={3}></textarea>
                            </div>
                            <div>
                                <label htmlFor="questionSourceUrl" className={labelClass}><FileSpreadsheet size={14}/> Question Source URL</label>
                                <input type="url" name="questionSourceUrl" id="questionSourceUrl" value={editedExamData.questionSourceUrl} onChange={handleInputChange} className={inputClass} placeholder="https://docs.google.com/spreadsheets/d/..."/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="numberOfQuestions" className={labelClass}>Questions</label>
                                    <input type="number" name="numberOfQuestions" id="numberOfQuestions" value={editedExamData.numberOfQuestions} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="passScore" className={labelClass}>Pass Score (%)</label>
                                    <input type="number" name="passScore" id="passScore" value={editedExamData.passScore} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="durationMinutes" className={labelClass}>Duration (Mins)</label>
                                    <input type="number" name="durationMinutes" id="durationMinutes" value={editedExamData.durationMinutes} onChange={handleInputChange} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="certificateTemplateId" className={labelClass}><Award size={14}/> Certificate Template</label>
                                    <select name="certificateTemplateId" id="certificateTemplateId" value={editedExamData.certificateTemplateId} onChange={handleInputChange} className={inputClass}>
                                        {activeOrg?.certificateTemplates.map(template => (
                                            <option key={template.id} value={template.id}>{template.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="recommendedBookId" className={labelClass}><Book size={14}/> Recommended Book</label>
                                    <select name="recommendedBookId" id="recommendedBookId" value={editedExamData.recommendedBookId} onChange={handleInputChange} className={inputClass}>
                                        <option value="">None</option>
                                        {activeOrg?.suggestedBooks.map(book => (
                                            <option key={book.id} value={book.id}>{book.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center">
                                        <input type="checkbox" name="isPractice" id="isPractice" checked={!!editedExamData.isPractice} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                        <label htmlFor="isPractice" className="ml-2 block text-sm text-slate-900">Is Practice Exam?</label>
                                    </div>
                                     <div className="flex items-center">
                                        <input type="checkbox" name="isProctored" id="isProctored" checked={!!editedExamData.isProctored} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                        <label htmlFor="isProctored" className="ml-2 block text-sm text-slate-900 flex items-center gap-1"><Cpu size={14} /> Enable Browser Proctoring?</label>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={handleCancel} className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">
                                        <X size={16} /><span>Cancel</span>
                                    </button>
                                    <button onClick={handleSave} className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition">
                                        <Save size={16} /><span>Save Changes</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Lightbulb className="mr-3 text-cyan-500" />
                    Architectural Vision: A Multi-Subject Platform
                </h2>
                <div className="space-y-4 text-slate-600">
                    <p>
                        This application has a robust architectural foundation that makes it highly adaptable to subjects beyond medical coding (e.g., law, finance, IT certifications). The core concept is the separation of the application's <strong>engine</strong> from its <strong>content</strong>.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-semibold text-slate-700">The Platform (Engine)</h4>
                            <p className="text-sm">Subject-agnostic, reusable parts like the user system, exam player, results engine, and AI feedback system.</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-semibold text-slate-700">The Content (Fuel)</h4>
                            <p className="text-sm">Subject-specific data like exam names, descriptions, question sources, and certificate text.</p>
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">Current Architecture</h3>
                    <p>
                        All subject-specific data—exam names, descriptions, question sources, certificate templates—is loaded from a central configuration. This makes the application "multi-tenant" by design.
                    </p>
                    <p>
                        Launching a version for a new subject only requires creating a new configuration file (or updating the existing one) and a new Google Sheet with questions, requiring <strong>no further code changes</strong>. This architecture ensures the platform is versatile and scalable.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Admin;