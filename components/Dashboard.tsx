import React, { FC, useMemo, useState, useEffect } from 'react';
// FIX: Corrected import statement for react-router-dom to resolve module export errors.
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, TestResult, ExamProductCategory } from '../types.ts';
import { Award, BarChart2, BookOpen, ChevronRight, Clock, Star, Zap, RefreshCw, AlertTriangle, CheckCircle, XCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner.tsx';

interface ExamCardProps {
    exam: Exam;
    isPractice: boolean;
    results: TestResult[];
}

const ExamCard: FC<ExamCardProps> = ({ exam, isPractice, results }) => {
    const navigate = useNavigate();
    const { paidExamIds, isSubscribed } = useAuth();
    const { activeOrg } = useAppContext();

    const attempts = useMemo(() => results.filter(r => r.examId === exam.id), [results, exam.id]);
    const hasPassed = useMemo(() => attempts.some(r => r.score >= exam.passScore), [attempts, exam.passScore]);

    let buttonText = 'Start Exam';
    let buttonDisabled = false;
    let buttonAction = () => navigate(`/test/${exam.id}`);
    let reason = '';

    if (isPractice) {
        buttonText = 'Start Practice';
        if (!isSubscribed && attempts.length >= 10) {
            buttonDisabled = true;
            reason = '10 free attempts used.';
        }
    } else { // Certification exam
        if (hasPassed) {
            buttonDisabled = true;
            reason = 'Already Passed';
        } else if (attempts.length >= 3) {
            buttonDisabled = true;
            reason = '3 attempts used.';
        } else if (!paidExamIds.includes(exam.productSku) && !isSubscribed) {
            buttonDisabled = true;
            buttonText = 'Purchase to Start';
            // FIX: The toast.error function returns a string, which is not a valid return type for an onClick handler. This was changed to a block that returns void to resolve the type error.
            buttonAction = () => {
                if (exam.productSlug) {
                    navigate(`/checkout/${exam.productSlug}`);
                } else {
                    toast.error("Checkout not available for this item.");
                }
            };
            reason = 'Purchase required';
        }
    }

    const price = exam.price;
    const regularPrice = exam.regularPrice;
    
    return (
        <div className={`flex flex-col rounded-lg p-6 border-2 ${isPractice ? 'bg-slate-50 border-slate-200' : 'bg-cyan-50 border-cyan-200'}`}>
            <div className="flex items-center gap-3 mb-3">
                {isPractice ? <BookOpen className="text-slate-500" /> : <Award className="text-cyan-600" />}
                <h4 className="text-xl font-bold text-slate-800">{exam.name}</h4>
            </div>
            <p className="text-slate-600 text-sm flex-grow mb-4">{exam.description}</p>
            <div className="text-xs text-slate-500 mb-4">
                {exam.numberOfQuestions} Questions | {exam.durationMinutes} Mins | Pass: {exam.passScore}%
            </div>

            <button onClick={buttonAction} disabled={buttonDisabled && reason !== 'Purchase required'} className={`w-full mt-auto flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 ${
                buttonDisabled && reason !== 'Purchase required'
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : isPractice 
                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}>
                {buttonDisabled && reason !== 'Purchase required' ? <Lock size={16} /> : <Zap size={16} />}
                <span>{buttonText}</span>
            </button>
            {buttonDisabled && reason && reason !== 'Purchase required' && (
                <p className="text-xs text-center text-red-600 mt-2">{reason}</p>
            )}
            {!isPractice && !paidExamIds.includes(exam.productSku) && !isSubscribed && price && (
                <div className="text-center mt-2">
                    <span className="text-lg font-bold text-slate-800">${price.toFixed(2)}</span>
                    {regularPrice && regularPrice > price && <span className="text-sm line-through text-slate-500 ml-1">${regularPrice.toFixed(2)}</span>}
                </div>
            )}
        </div>
    );
}


const Dashboard: FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, token, isSubscribed, loginWithToken } = useAuth();
    const { activeOrg, inProgressExam } = useAppContext();
    const [results, setResults] = useState<TestResult[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (user) {
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            userResults.sort((a, b) => b.timestamp - a.timestamp);
            setResults(userResults);
        }
    }, [user]);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                // Timeout ensures the element is painted before we try to scroll.
                const timer = setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [location, activeOrg]); // Rerun if location or content changes


    const handleSync = async () => {
        if (!token) {
            toast.error("You must be logged in to sync.");
            return;
        }
        setIsSyncing(true);
        try {
            await loginWithToken(token, true); // isSyncOnly = true
            if (user) {
                const updatedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
                updatedResults.sort((a, b) => b.timestamp - a.timestamp);
                setResults(updatedResults);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to sync exams.");
        } finally {
            setIsSyncing(false);
        }
    };
    
    const stats = useMemo(() => {
        if (results.length === 0) {
            return { attempts: 0, avgScore: 0, bestScore: 0, certs: 0 };
        }
        const totalScore = results.reduce((acc, r) => acc + r.score, 0);
        const bestScore = Math.max(...results.map(r => r.score));
        const certs = results.filter(r => {
            const exam = activeOrg?.exams.find(e => e.id === r.examId);
            return exam && !exam.isPractice && r.score >= exam.passScore;
        }).length;
        
        return {
            attempts: results.length,
            avgScore: Math.round(totalScore / results.length),
            bestScore: Math.round(bestScore),
            certs
        };
    }, [results, activeOrg]);

    if (!user || !activeOrg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <p className="mt-4 text-slate-500">Loading Dashboard...</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-4xl font-extrabold text-slate-900">
                    Welcome, <span className="text-cyan-600">{user.name.split(' ')[0]}</span>!
                </h1>
                <button 
                    onClick={handleSync} 
                    disabled={isSyncing} 
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-200 disabled:text-slate-400"
                >
                    {isSyncing ? <Spinner /> : <RefreshCw size={16} />}
                    <span>{isSyncing ? 'Syncing...' : 'Sync My Exams'}</span>
                </button>
            </div>

            {inProgressExam && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        <div>
                            <h3 className="font-bold text-yellow-800">Exam in Progress</h3>
                            <p className="text-sm text-yellow-700">You have an unfinished exam: <strong>{inProgressExam.examName}</strong>.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate(`/test/${inProgressExam.examId}`)} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-1">
                        Resume Now <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {!isSubscribed && (
                 <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Star className="h-10 w-10 text-yellow-300" />
                        <div>
                            <h2 className="text-2xl font-bold">Go Premium!</h2>
                            <p className="text-blue-200">Unlock unlimited practice exams and AI-powered feedback.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/pricing')} className="bg-white text-cyan-600 font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 flex-shrink-0">
                        View Plans
                    </button>
                </div>
            )}

            <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-6" id="exam-programs">My Exam Programs</h2>
                <div className="space-y-12">
                    {activeOrg.examProductCategories.map((category: ExamProductCategory) => {
                        const practiceExam = activeOrg?.exams.find(e => e.id === category.practiceExamId);
                        const certExam = activeOrg?.exams.find(e => e.id === category.certificationExamId);
                        
                        return (
                            <div key={category.id} id={category.id} className="bg-white p-6 rounded-xl shadow-md border border-slate-200 scroll-mt-20">
                                <h3 className="text-2xl font-bold text-slate-800 mb-1">{category.name}</h3>
                                <p className="text-slate-500 mb-6">{category.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {practiceExam && <ExamCard exam={practiceExam} isPractice={true} results={results} />}
                                    {certExam && <ExamCard exam={certExam} isPractice={false} results={results} />}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                        <BarChart2 className="mr-3 text-cyan-500" /> My Stats
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-600">Total Attempts</span>
                            <span className="text-2xl font-bold text-slate-800">{stats.attempts}</span>
                        </div>
                        <div className="flex justify-between items-baseline bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-600">Average Score</span>
                            <span className="text-2xl font-bold text-slate-800">{stats.avgScore}%</span>
                        </div>
                        <div className="flex justify-between items-baseline bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-600">Best Score</span>
                            <span className="text-2xl font-bold text-green-600">{stats.bestScore}%</span>
                        </div>
                        <div className="flex justify-between items-baseline bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-600">Certificates</span>
                            <span className="text-2xl font-bold text-cyan-600">{stats.certs}</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                        <Clock className="mr-3 text-cyan-500" /> My Exam History
                    </h3>
                    {results.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {results.map(result => {
                                const exam = activeOrg.exams.find(e => e.id === result.examId);
                                if (!exam) return null;
                                const isPass = result.score >= exam.passScore;
                                return (
                                    <div key={result.testId} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center gap-2">
                                        <div>
                                            <p className="font-semibold text-slate-800">{exam.name}</p>
                                            <p className="text-xs text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isPass ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                                            <span className={`font-bold text-lg ${isPass ? 'text-green-600' : 'text-red-600'}`}>{result.score}%</span>
                                            <button onClick={() => navigate(`/results/${result.testId}`)} className="text-sm font-semibold text-cyan-600 hover:underline">
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-center text-slate-500 py-10">No exam history yet.</p>}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;