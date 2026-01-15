import React, { FC, useState, useEffect, useMemo } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors.
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM as any;
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam } from '../types.ts';
import { User, Edit, Save, X, History, Award, CheckCircle, XCircle, ChevronRight, Gift, Star, Paintbrush, Check, Shield, AlertCircle } from 'lucide-react';
import Spinner from './Spinner.tsx';

const themeColors: { [key: string]: { [key: string]: string } } = {
    default: {
        primary: 'rgb(6, 182, 212)',
        secondary: 'rgb(219, 39, 119)',
        accent: 'rgb(253, 224, 71)',
        background: 'rgb(30, 41, 59)',
    },
    professional: {
        primary: 'rgb(4, 120, 87)',
        secondary: 'rgb(59, 130, 246)',
        accent: 'rgb(234, 179, 8)',
        background: 'rgb(241, 245, 249)',
    },
    serene: {
        primary: 'rgb(96, 165, 250)',
        secondary: 'rgb(52, 211, 153)',
        accent: 'rgb(251, 146, 60)',
        background: 'rgb(240, 253, 250)',
    },
    academic: {
        primary: 'rgb(127, 29, 29)',
        secondary: 'rgb(161, 98, 7)',
        accent: 'rgb(217, 119, 6)',
        background: 'rgb(254, 252, 251)',
    },
    noir: {
        primary: 'rgb(229, 231, 235)',
        secondary: 'rgb(139, 92, 246)',
        accent: 'rgb(234, 179, 8)',
        background: 'rgb(31, 41, 55)',
    }
};

const Profile: FC = () => {
    const { user, token, updateUserName, isSubscribed, isEffectivelyAdmin, isBetaTester, loginWithToken } = useAuth();
    const { activeOrg, availableThemes, activeTheme, setActiveTheme } = useAppContext();
    const navigate = useNavigate();

    const [results, setResults] = useState<TestResult[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [isLoadingResults, setIsLoadingResults] = useState(true);
    const [isSavingBetaStatus, setIsSavingBetaStatus] = useState(false);

    useEffect(() => {
        if (user && token) {
            setIsLoadingResults(true);
            const cachedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            cachedResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(cachedResults);
    
            const performSync = async () => {
                try {
                    const updatedResults = await googleSheetsService.syncResults(user, token);
                    updatedResults.sort((a, b) => b.timestamp - a.timestamp);
                    setResults(updatedResults);
                } catch (error: any) {
                    toast.error(error.message || "Could not sync exam history.");
                } finally {
                    setIsLoadingResults(false);
                }
            };
    
            performSync();
        }
    }, [user, token]);

    useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const handleNameSave = async () => {
        if (!name.trim()) {
            toast.error("Name cannot be empty.");
            return;
        }
        if (!token) {
            toast.error("Authentication error. Please re-login.");
            return;
        }

        setIsSavingName(true);
        const toastId = toast.loading('Syncing name with your profile...');

        try {
            await googleSheetsService.updateUserName(token, name.trim());
            updateUserName(name.trim());
            setIsEditingName(false);
            toast.success("Full name updated successfully.", { id: toastId });
        } catch (error: any) {
            console.error("Error updating name:", error);
            toast.error(error.message || "An error occurred.", { id: toastId });
        } finally {
            setIsSavingName(false);
        }
    };
    
    const handleBetaToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!token) { toast.error("Authentication Error"); return; }
        const newStatus = e.target.checked;
        setIsSavingBetaStatus(true);
        const toastId = toast.loading(newStatus ? 'Enabling Beta Tester Mode...' : 'Disabling Beta Tester Mode...');
        try {
            const response = await googleSheetsService.adminToggleBetaStatus(token, newStatus);
            if (response.token) {
                await loginWithToken(response.token, true);
                toast.success(newStatus ? 'Beta Tester Mode Enabled' : 'Beta Tester Mode Disabled', { id: toastId });
            } else {
                throw new Error("Server did not return an updated token.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to toggle beta status.", { id: toastId });
        } finally {
            setIsSavingBetaStatus(false);
        }
    };

    /**
     * Enhanced Exam Lookup
     * Handles cases where exams were deleted/reinstated by checking SKUs and Names if IDs fail.
     */
    const getExamDetails = (examId: string): Exam | undefined => {
        if (!activeOrg?.exams) return undefined;
        
        // 1. Direct match by ID (Fastest)
        let found = activeOrg.exams.find(e => e.id === examId);
        if (found) return found;

        // 2. Loose match by SKU (Handles reinstated Certifications)
        found = activeOrg.exams.find(e => e.productSku === examId);
        if (found) return found;
        
        // 3. Loose match by name pattern (Handles reinstated items with name-based legacy IDs)
        // Technical IDs often look like: exam-prod-12345-practice
        const cleanName = examId.replace('exam-', '').replace('-practice', '').replace('prod-', '').toLowerCase();
        found = activeOrg.exams.find(e => 
            e.name.toLowerCase().includes(cleanName) || 
            (e.productSku && e.productSku.toLowerCase() === cleanName)
        );
        if (found) return found;

        return undefined;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="flex items-start space-x-4 mb-6">
                    <div className="bg-cyan-100 p-3 rounded-full">
                        <User className="h-8 w-8 text-cyan-600" />
                    </div>
                    <div className="flex-grow">
                        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
                        <p className="text-slate-500">Manage your account details and view your progress.</p>
                    </div>
                    {isSubscribed && (
                        <div className="ml-auto bg-yellow-300 text-yellow-800 text-sm font-bold px-4 py-1 rounded-full flex items-center gap-2 flex-shrink-0">
                            <Star size={16} className="fill-current"/> Premium Member
                        </div>
                    )}
                </div>

                {user ? (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-slate-500">Full Name (for Certificates)</label>
                            {isEditingName ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-grow border border-slate-300 rounded-md px-2 py-1 text-lg"
                                        placeholder="Enter your full name"
                                        disabled={isSavingName}
                                    />
                                    <button onClick={handleNameSave} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-slate-400" aria-label="Save name" disabled={isSavingName}>
                                        {isSavingName ? <Spinner /> : <Save size={16} />}
                                    </button>
                                    <button onClick={() => { setIsEditingName(false); setName(user.name || ''); }} className="p-2 bg-slate-400 text-white rounded-md hover:bg-slate-500" aria-label="Cancel edit" disabled={isSavingName}><X size={16} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-lg font-semibold text-slate-800">{user.name}</p>
                                    <button onClick={() => setIsEditingName(true)} className="p-1 text-slate-500 hover:text-slate-800" title="Edit your name for the certificate" aria-label="Edit name"><Edit size={16} /></button>
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-slate-500">Email Address</label>
                            <p className="text-lg font-semibold text-slate-800">{user.email}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-slate-500">User ID</label>
                            <p className="text-lg font-semibold text-slate-800">{user.id}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-slate-500">Could not load user profile.</p>
                )}
            </div>
            
            {isEffectivelyAdmin && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                        <Shield className="mr-3 text-cyan-500" />
                        Administrator Tools
                    </h2>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold">Beta Tester Mode</h4>
                                <p className="text-xs text-slate-500">Simulate the beta tester experience (e.g., watermarked certificates).</p>
                            </div>
                            <label htmlFor="toggle-beta-mode" className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        id="toggle-beta-mode"
                                        className="sr-only"
                                        checked={isBetaTester}
                                        onChange={handleBetaToggle}
                                        disabled={isSavingBetaStatus}
                                    />
                                    <div className={`block w-14 h-8 rounded-full ${isBetaTester ? 'bg-cyan-600' : 'bg-slate-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isBetaTester ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            )}
            
            {(availableThemes || []).length > 0 && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                        <Paintbrush className="mr-3 text-cyan-500" />
                        Theme &amp; Appearance
                    </h2>
                    <p className="text-slate-500 mb-6">Select a theme to change the application's appearance. Your choice is saved on this browser.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {(availableThemes || []).map(theme => (
                            <button
                                type="button"
                                key={theme.id}
                                onClick={() => setActiveTheme(theme.id)}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition text-left ${activeTheme === theme.id ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-200 hover:border-cyan-400'}`}
                            >
                                {activeTheme === theme.id && (
                                    <div className="absolute -top-2 -right-2 bg-cyan-500 text-white rounded-full p-1 shadow-md">
                                        <Check size={14} />
                                    </div>
                                )}
                                <div className="flex justify-center space-x-1 h-8 pointer-events-none">
                                    <div className="w-1/4 rounded shadow-sm" style={{ backgroundColor: themeColors[theme.id]?.primary || '#ccc' }}></div>
                                    <div className="w-1/4 rounded shadow-sm" style={{ backgroundColor: themeColors[theme.id]?.secondary || '#ccc' }}></div>
                                    <div className="w-1/4 rounded shadow-sm" style={{ backgroundColor: themeColors[theme.id]?.accent || '#ccc' }}></div>
                                    <div className="w-1/4 rounded shadow-sm" style={{ backgroundColor: themeColors[theme.id]?.background || '#ccc' }}></div>
                                </div>
                                <p className="font-semibold text-center mt-2 text-slate-700 pointer-events-none">{theme.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <History className="mr-3 text-cyan-500" />
                    My Exam History
                </h2>
                {isLoadingResults ? (
                    <div className="text-center py-6"><Spinner /></div>
                ) : results.length > 0 ? (
                    <div className="space-y-4">
                        {results.map(result => {
                            const exam = getExamDetails(result.examId);
                            
                            // If the exam is not in current active catalog, we show it as a Legacy record
                            const isLegacy = !exam;
                            
                            // CLEAN NAME FALLBACK: Strip technical prefixes for a better display if exam is missing
                            const examName = exam ? exam.name : result.examId
                                .replace('prac-', 'Practice: ')
                                .replace('exam-prod-', 'Legacy: ')
                                .replace('-practice', '')
                                .replace(/[_\-]/g, ' ');

                            const passScore = exam ? exam.passScore : 70;
                            const isPass = result.score >= passScore;
                            const scoreColor = isPass ? 'text-green-600' : 'text-red-500';
                            const canGetCertificate = isPass && exam?.certificateEnabled;

                            return (
                                <div key={result.testId} className={`p-4 rounded-lg border ${isLegacy ? 'bg-slate-100/50 border-slate-300 border-dashed' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg text-slate-800 capitalize">{examName}</h3>
                                                {isLegacy && (
                                                    <span className="flex items-center gap-1 bg-slate-200 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-tighter" title="This exam was modified or removed from the catalog. Your result remains recorded.">
                                                        <AlertCircle size={10}/> Archived Record
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold text-2xl ${scoreColor}`}>{result.score.toFixed(0)}%</span>
                                            {isPass ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={14} className="mr-1" /> Passed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <XCircle size={14} className="mr-1" /> Failed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
                                        <div className="text-sm text-slate-600">
                                            <span>Correct: <strong>{result.correctCount}/{result.totalQuestions}</strong></span>
                                            <span className="mx-2 text-slate-300">|</span>
                                            <span>Passing Score: <strong>{passScore}%</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => navigate(`/results/${result.testId}`)} className="text-sm font-semibold text-cyan-600 hover:text-cyan-800 flex items-center gap-1">
                                                View Details <ChevronRight size={16} />
                                            </button>
                                            {(canGetCertificate || (isEffectivelyAdmin && !isLegacy)) && (
                                                <button 
                                                    onClick={() => navigate(`/certificate/${result.testId}`)} 
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                                    title={isEffectivelyAdmin && !canGetCertificate ? "View Certificate (Admin Override)" : "View Certificate"}
                                                >
                                                    <Award size={16} className="mr-2" /> Certificate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-6">You have not attempted any exams yet.</p>
                )}
            </div>
        </div>
    );
};

export default Profile;