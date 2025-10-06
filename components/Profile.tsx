import React, { FC, useState, useEffect } from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam } from '../types.ts';
import { User, Edit, Save, X, History, Award, CheckCircle, XCircle, ChevronRight, Gift, Star, Paintbrush, Check } from 'lucide-react';
import Spinner from './Spinner.tsx';

const Profile: FC = () => {
    const { user, token, updateUserName, wonPrize, isSubscribed, isEffectivelyAdmin } = useAuth();
    const { activeOrg, availableThemes, activeTheme, setActiveTheme } = useAppContext();
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();

    const [results, setResults] = useState<TestResult[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [isLoadingResults, setIsLoadingResults] = useState(true);
    const [showNotifications, setShowNotifications] = useState(() => {
        try {
            return localStorage.getItem('mco_show_notifications') !== 'false';
        } catch (e) {
            return true;
        }
    });

    const handleToggleNotifications = () => {
        const newValue = !showNotifications;
        setShowNotifications(newValue);
        try {
            localStorage.setItem('mco_show_notifications', String(newValue));
            toast.success(`Sales notifications ${newValue ? 'enabled' : 'disabled'}.`);
        } catch (e) {
            toast.error("Could not save preference.");
        }
    };

    useEffect(() => {
        if (user && token) {
            setIsLoadingResults(true);
    
            // Immediately load and display any cached results
            const cachedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            cachedResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(cachedResults);
    
            // Sync with the server to get the latest data
            const performSync = async () => {
                try {
                    await googleSheetsService.syncResults(user, token);
                    // After syncing, re-read from local storage which is now up-to-date
                    const updatedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
                    updatedResults.sort((a, b) => b.timestamp - a.timestamp);
                    setResults(updatedResults);
                } catch (error: any) {
                    toast.error(error.message || "Could not sync exam history.");
                } finally {
                    // Sync is complete (or failed), so stop loading spinner
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
    
    const getExamDetails = (examId: string): Exam | undefined => {
        return activeOrg?.exams.find(e => e.id === examId);
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
                         {wonPrize && wonPrize.prizeId !== 'NEXT_TIME' && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <h3 className="text-sm font-medium text-amber-700 flex items-center gap-2"><Gift size={16}/> Spin & Win Prize</h3>
                                <p className="text-lg font-semibold text-amber-900 mt-1">You won: <strong>{wonPrize.prizeLabel}</strong></p>
                            </div>
                        )}
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
                        {isEffectivelyAdmin && (
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-slate-500">Admin: Show Sales Notifications</label>
                                        <p className="text-xs text-slate-400">Toggle the live purchase pop-ups for your account.</p>
                                    </div>
                                    <button
                                        onClick={handleToggleNotifications}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                                            showNotifications ? 'bg-cyan-600' : 'bg-slate-300'
                                        }`}
                                        role="switch"
                                        aria-checked={showNotifications}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                showNotifications ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-slate-500">Could not load user profile.</p>
                )}
            </div>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center mb-4">
                    <Paintbrush className="mr-3 text-[rgb(var(--color-primary-rgb))]" />
                    Theme & Appearance
                </h2>
                <p className="text-[rgb(var(--color-text-muted-rgb))] mb-6">
                    Select a theme to change the application's appearance. Your choice is saved on this browser.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {availableThemes.map(theme => (
                        <button
                            type="button"
                            key={theme.id}
                            onClick={() => setActiveTheme(theme.id)}
                            className={`relative p-4 rounded-lg border-2 cursor-pointer transition text-left ${activeTheme === theme.id ? 'border-[rgb(var(--color-primary-rgb))] ring-2 ring-[rgba(var(--color-primary-rgb),0.2)]' : 'border-[rgb(var(--color-border-rgb))] hover:border-[rgba(var(--color-primary-rgb),0.5)]'}`}
                        >
                            {activeTheme === theme.id && (
                                <div className="absolute -top-2 -right-2 bg-[rgb(var(--color-primary-rgb))] text-white rounded-full p-1 shadow-md">
                                    <Check size={14} />
                                </div>
                            )}
                            <div className="flex justify-center space-x-1 h-8 pointer-events-none">
                                <div className={`w-1/4 rounded theme-swatch-${theme.id}-primary`}></div>
                                <div className={`w-1/4 rounded theme-swatch-${theme.id}-secondary`}></div>
                                <div className={`w-1/4 rounded theme-swatch-${theme.id}-accent`}></div>
                                <div className={`w-1/4 rounded theme-swatch-${theme.id}-background`}></div>
                            </div>
                            <p className="font-semibold text-center mt-2 text-[rgb(var(--color-text-default-rgb))] pointer-events-none">{theme.name}</p>
                        </button>
                    ))}
                </div>
            </div>

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
                            if (!exam) return null;
                            const isPass = result.score >= exam.passScore;
                            const scoreColor = isPass ? 'text-green-600' : 'text-red-500';
                            const canGetCertificate = !exam.isPractice && isPass;

                            return (
                                <div key={result.testId} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-lg text-slate-800">{exam.name}</h3>
                                            <p className="text-sm text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold text-2xl ${scoreColor}`}>{result.score}%</span>
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
                                            <span>Passing Score: <strong>{exam.passScore}%</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => navigate(`/results/${result.testId}`)} className="text-sm font-semibold text-cyan-600 hover:text-cyan-800 flex items-center gap-1">
                                                View Details <ChevronRight size={16} />
                                            </button>
                                            {canGetCertificate && (
                                                <button onClick={() => navigate(`/certificate/${result.testId}`)} className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
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