

import React, { FC, useState, useEffect } from 'react';
// Fix: Update react-router-dom imports to v6 syntax.
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam } from '../types.ts';
import { User, Edit, Save, X, History, Award, CheckCircle, XCircle, ChevronRight, Gift, Star } from 'lucide-react';
import Spinner from './Spinner.tsx';

const Profile: FC = () => {
    const { user, token, updateUserName, wonPrize, isSubscribed } = useAuth();
    const { activeOrg } = useAppContext();
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();

    const [results, setResults] = useState<TestResult[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [isLoadingResults, setIsLoadingResults] = useState(true);

    useEffect(() => {
        if (user && token) {
            setIsLoadingResults(true);
            const cachedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            cachedResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(cachedResults);
            setIsLoadingResults(false);

            // Sync with server in the background to get latest results
            googleSheetsService.syncResults(user, token).then(() => {
                const updatedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
                updatedResults.sort((a, b) => b.timestamp - a.timestamp);
                setResults(updatedResults);
            });
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
                    </div>
                ) : (
                    <p className="text-center text-slate-500">Could not load user profile.</p>
                )}
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