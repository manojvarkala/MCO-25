import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult } from '../types.ts';
import Spinner from './Spinner.tsx';
import { BookCopy, History, FlaskConical, Eye, FileText, BarChart, BadgePercent, Trophy, ArrowRight, Home, RefreshCw, Star, Zap, CheckCircle, Lock, Edit, Save, X, ShoppingCart, AlertTriangle, Award } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import toast from 'react-hot-toast';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, paidExamIds, isSubscribed, updateUserName, token } = useAuth();
    const { activeOrg } = useAppContext();
    const [results, setResults] = useState<TestResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [stats, setStats] = useState({ avgScore: 0, bestScore: 0, examsTaken: 0 });
    const [practiceStats, setPracticeStats] = useState({ attemptsTaken: 0, attemptsAllowed: 0 });
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [name, setName] = useState(user?.name || '');

    const loginUrl = 'https://www.coding-online.net/exam-login/';
    const appDashboardPath = '/dashboard';
    const syncUrl = `${loginUrl}?redirect_to=${encodeURIComponent(appDashboardPath)}`;
    const browseExamsUrl = 'https://www.coding-online.net/exam-programs';
    const updateNameEndpoint = 'https://www.coding-online.net/wp-json/exam-app/v1/update-name';


    useEffect(() => {
        if (!user || !activeOrg) {
            if (activeOrg) setIsLoading(false);
            return;
        };
        const fetchResults = async () => {
            setIsLoading(true);
            setHistoryError(null);
            try {
                const userResults = await googleSheetsService.getTestResultsForUser(user);
                setResults(userResults);
                
                if (userResults.length > 0) {
                    const totalScore = userResults.reduce((sum, r) => sum + r.score, 0);
                    const avg = totalScore / userResults.length;
                    const best = Math.max(...userResults.map(r => r.score));
                    setStats({
                        avgScore: parseFloat(avg.toFixed(1)),
                        bestScore: best,
                        examsTaken: userResults.length
                    });
                } else {
                    setStats({ avgScore: 0, bestScore: 0, examsTaken: 0 });
                }

                const practiceExamIds = new Set(activeOrg.exams.filter(e => e.isPractice).map(e => e.id));
                const practiceAttemptsTaken = userResults.filter(r => practiceExamIds.has(r.examId)).length;
                setPracticeStats({ attemptsTaken: practiceAttemptsTaken, attemptsAllowed: 10 });

            } catch (error: any) {
                console.error("Failed to fetch dashboard results:", error);
                const errorMessage = "Could not load your exam history.";
                toast.error(errorMessage);
                setHistoryError(errorMessage);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [user, activeOrg]);

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
            const response = await fetch(updateNameEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fullName: name.trim() })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update name.');
            }

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


    const processedPurchasedExams = useMemo(() => {
        if (!activeOrg || !results) return [];
        
        return activeOrg.exams
            .filter(e => e.productSku && paidExamIds.includes(e.productSku) && !e.isPractice)
            .map(exam => {
                const examResults = results.filter(r => r.examId === exam.id);
                const attemptsMade = examResults.length;
                const hasPassed = examResults.some(r => r.score >= exam.passScore);
                const bestScore = examResults.length > 0 ? Math.max(...examResults.map(r => r.score)) : null;
    
                let status: 'passed' | 'attempts_exceeded' | 'available' = 'available';
                if (hasPassed) {
                    status = 'passed';
                } else if (attemptsMade >= 3) {
                    status = 'attempts_exceeded';
                }
    
                return {
                    ...exam,
                    attemptsMade,
                    status,
                    bestScore
                };
            });
    }, [activeOrg, paidExamIds, results]);

    const availableToPurchaseExams = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.exams.filter(e => !e.isPractice && e.productSku && !paidExamIds.includes(e.productSku));
    }, [activeOrg, paidExamIds]);


    if (isLoading || !activeOrg) {
        return <div className="flex flex-col items-center justify-center h-64"><Spinner /><p className="mt-4">Loading your dashboard...</p></div>;
    }

    const getExamName = (examId: string) => activeOrg.exams.find(e => e.id === examId)?.name || 'Unknown Exam';
    const practiceExams = activeOrg.exams.filter(e => e.isPractice);
    

    return (
        <div>
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                 <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-lg">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                                placeholder="Enter your full name"
                                disabled={isSavingName}
                            />
                            <button onClick={handleNameSave} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-slate-400" aria-label="Save name" disabled={isSavingName}>
                                {isSavingName ? <Spinner /> : <Save size={16} />}
                            </button>
                            <button onClick={() => { setIsEditingName(false); setName(user?.name || ''); }} className="p-2 bg-slate-400 text-white rounded-md hover:bg-slate-500" aria-label="Cancel edit" disabled={isSavingName}><X size={16} /></button>
                        </div>
                    ) : (
                         <div className="flex items-center gap-2">
                            <span className="text-slate-600 text-sm sm:text-base">Welcome back, <strong>{user?.name}!</strong></span>
                            <button onClick={() => setIsEditingName(true)} className="p-1 text-slate-500 hover:text-slate-800" title="Edit your name for the certificate" aria-label="Edit name"><Edit size={16} /></button>
                        </div>
                    )}
                </div>
            </div>
            {!user?.name.includes(' ') && (
                <div className="mb-8 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm text-center">
                    Please ensure your full name is set correctly for your certificate. Click the edit icon above if needed.
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                     {/* New Purchase Notification */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center space-x-3">
                            <RefreshCw className="text-blue-600" size={24} />
                            <div>
                                <p className="font-semibold text-blue-800">Just made a purchase or switching sites?</p>
                                <p className="text-sm text-blue-700">Click below to sync your latest data. This loads purchased exams and test history.</p>
                            </div>
                        </div>
                        <a
                            href={syncUrl}
                            className="mt-3 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            title="This takes you to our main site to securely sync your purchased exams with your account."
                        >
                            Sync My Exams
                        </a>
                    </div>

                    {/* My Certification Exams */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-4"><BookCopy className="mr-3 text-cyan-500" /> My Certification Exams</h2>
                        <div className="space-y-3">
                            {processedPurchasedExams.length > 0 ? processedPurchasedExams.map(exam => {
                                const canTakeTest = exam.status === 'available';
                                
                                let buttonContent: React.ReactNode;
                                if (exam.status === 'passed') {
                                    buttonContent = <><CheckCircle size={16} className="mr-2"/> Passed</>;
                                } else if (exam.status === 'attempts_exceeded') {
                                    buttonContent = 'Attempts Exceeded';
                                } else if (exam.attemptsMade > 0) {
                                    buttonContent = 'Retake Exam';
                                } else {
                                    buttonContent = 'Start Exam';
                                }

                                return (
                                     <div key={exam.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-slate-800">{exam.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm text-slate-500">{exam.numberOfQuestions} questions</p>
                                                {exam.status === 'passed' && (
                                                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12}/>Passed</span>
                                                )}
                                                {exam.status === 'attempts_exceeded' && (
                                                    <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">3/3 Attempts Used</span>
                                                )}
                                                {exam.status === 'available' && exam.attemptsMade > 0 && (
                                                    <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">{exam.attemptsMade}/3 Attempts</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            {exam.bestScore !== null && (
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500">Best</p>
                                                    <p className="font-bold text-lg text-cyan-600">{exam.bestScore}%</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => navigate(`/test/${exam.id}`)}
                                                disabled={!canTakeTest}
                                                className="flex-grow flex items-center justify-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                                            >
                                                {buttonContent}
                                            </button>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="text-center py-6 text-slate-500">
                                    <p>You haven't purchased any certification exams yet. See available exams below.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Available Certification Exams */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-4"><ShoppingCart className="mr-3 text-cyan-500" /> Available Exams</h2>
                        <div className="space-y-3">
                            {availableToPurchaseExams.length > 0 ? availableToPurchaseExams.map(exam => (
                                <div key={exam.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-slate-700">{exam.name}</h3>
                                        <p className="text-sm text-slate-500">{exam.description}</p>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                                        <div className="text-right">
                                            {exam.regularPrice && exam.regularPrice > exam.price ? (
                                                <>
                                                    <span className="text-2xl font-bold text-green-600">${exam.price.toFixed(2)}</span>
                                                    <span className="text-md text-slate-500 line-through ml-2">${exam.regularPrice.toFixed(2)}</span>
                                                </>
                                            ) : (
                                                <span className="text-2xl font-bold text-cyan-600">${exam.price.toFixed(2)}</span>
                                            )}
                                        </div>
                                        <a
                                            href={exam.productSlug ? `#/checkout/${exam.productSlug}` : browseExamsUrl}
                                            target={exam.productSlug ? '_self' : '_blank'}
                                            rel="noopener noreferrer"
                                            className="w-full sm:w-auto flex-grow flex items-center justify-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition"
                                        >
                                            Buy Now
                                        </a>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-6 text-slate-500">
                                    <p>No exams available for purchase at this time.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Practice Exams Section */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-4"><FlaskConical className="mr-3 text-cyan-500" /> Free Practice Exams</h2>
                        <div className="space-y-3">
                            {practiceExams.map(exam => (
                                <div key={exam.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-700">{exam.name}</h3>
                                        <p className="text-sm text-slate-500">{exam.numberOfQuestions} questions</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/test/${exam.id}`)}
                                        className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition flex items-center"
                                    >
                                        <Zap size={16} className="mr-2" />
                                        Start Practice
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-4"><History className="mr-3 text-cyan-500" /> My Exam History</h2>
                        {historyError && <p className="text-red-500">{historyError}</p>}
                        {results && results.length > 0 ? (
                            <div className="space-y-3">
                                {results.slice(0, 5).map(result => (
                                    <div key={result.testId} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-700">{getExamName(result.examId)}</h3>
                                            <p className="text-sm text-slate-500">{new Date(result.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className={`font-bold text-lg ${result.score >= (activeOrg.exams.find(e => e.id === result.examId)?.passScore || 70) ? 'text-green-600' : 'text-red-600'}`}>{result.score}%</p>
                                            <button
                                                onClick={() => navigate(`/results/${result.testId}`)}
                                                className="bg-white border border-slate-300 text-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 transition flex items-center"
                                            >
                                                <Eye size={16} className="mr-2" />
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500">
                                <p>You have not taken any exams yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Stats Section */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BarChart className="mr-3 text-cyan-500" /> My Stats</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <Trophy size={24} className="mx-auto text-yellow-500 mb-1" />
                                <p className="text-2xl font-bold text-slate-700">{stats.bestScore}%</p>
                                <p className="text-sm text-slate-500">Best Score</p>
                            </div>
                            <div>
                                <BadgePercent size={24} className="mx-auto text-green-500 mb-1" />
                                <p className="text-2xl font-bold text-slate-700">{stats.avgScore}%</p>
                                <p className="text-sm text-slate-500">Average Score</p>
                            </div>
                             <div>
                                <FileText size={24} className="mx-auto text-blue-500 mb-1" />
                                <p className="text-2xl font-bold text-slate-700">{stats.examsTaken}</p>
                                <p className="text-sm text-slate-500">Exams Taken</p>
                            </div>
                             <div>
                                <FlaskConical size={24} className="mx-auto text-purple-500 mb-1" />
                                <p className="text-2xl font-bold text-slate-700">{practiceStats.attemptsTaken}</p>
                                <p className="text-sm text-slate-500">Practice Tests</p>
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => navigate('/certificate/sample')}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Award size={16} />
                                Preview Certificate
                            </button>
                        </div>
                    </div>
                     {/* Suggested Books */}
                    <SuggestedBooksSidebar />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;