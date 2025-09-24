

import React, { FC, useState, useEffect, useMemo } from 'react';
// FIX: Use named imports for react-router-dom v6 components and hooks.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { FlaskConical, Trophy, RefreshCw, Star, BarChart, Clock, PlayCircle, Award, Target, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import toast from 'react-hot-toast';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

const DescriptionWithHashtags: FC<{ text: string }> = ({ text }) => {
    // Regex to find hashtags and split the text, keeping the hashtags as separate items
    const hashtagRegex = /(#[\w-]+)/g;
    const parts = text.split(hashtagRegex);
  
    return (
      <>
        {parts.map((part, index) => {
          if (hashtagRegex.test(part)) {
            return (
              <span key={index} className="inline-block bg-cyan-100 text-cyan-800 text-xs font-medium ml-1 px-2.5 py-0.5 rounded-full">
                {part}
              </span>
            );
          }
          return part;
        })}
      </>
    );
};


const StarRating: FC<{ rating: number; count: number; }> = ({ rating, count }) => {
    if (count === 0) return null;

    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center">
                {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} size={16} className="text-yellow-400 fill-current" />)}
                {halfStar && <Star size={16} className="text-yellow-400 fill-current" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' }} />}
                {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} size={16} className="text-slate-300 fill-current" />)}
            </div>
            {count > 0 && <span className="text-xs text-slate-500">({count} {count === 1 ? 'rating' : 'ratings'})</span>}
        </div>
    );
};

const Dashboard: FC = () => {
    // Fix: Use useNavigate for v6 compatibility.
    const navigate = useNavigate();
    const { user, token, paidExamIds, isSubscribed } = useAuth();
    const { activeOrg, isInitializing, inProgressExam, examPrices } = useAppContext();
    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoadingResults, setIsLoadingResults] = useState(true);
    const [stats, setStats] = useState<{ avg: number; best: number; completed: number } | null>(null);

    const mainSiteBaseUrl = useMemo(() => {
        return activeOrg ? `https://www.${activeOrg.website}` : '';
    }, [activeOrg]);

    const handleSync = () => {
        if (mainSiteBaseUrl) {
            // Redirect to the login page on the main site.
            // If the user is logged in there, the shortcode will generate a new token
            // and redirect back to the app's /auth route to sync data.
            window.location.href = `${mainSiteBaseUrl}/exam-login/`;
        } else {
            toast.error("Could not determine the main site URL to sync.");
        }
    };

    useEffect(() => {
        if (user) {
            setIsLoadingResults(true);
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            setResults(userResults);
            if (userResults.length > 0) {
                const scores = userResults.map(r => r.score);
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const best = Math.max(...scores);
                setStats({ avg: Math.round(avg), best: Math.round(best), completed: userResults.length });
            } else {
                setStats({ avg: 0, best: 0, completed: 0 });
            }
            setIsLoadingResults(false);
        }
    }, [user]);
    
    if (isInitializing || !activeOrg || !user) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading Dashboard...</p></div>;
    }
    
    // FIX: Add defensive checks to prevent crashes if config data is missing.
    const { examProductCategories: categories, exams } = activeOrg;
    
    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
                        <p className="text-purple-100 mt-1">Ready to ace your next exam?</p>
                    </div>
                    <button onClick={handleSync} className="flex-shrink-0 flex items-center gap-2 bg-white/20 hover:bg-white/30 font-semibold py-2 px-4 rounded-lg transition">
                        <RefreshCw size={16} /> Sync My Exams
                    </button>
                </div>
                
                {inProgressExam && (
                     <div className="bg-amber-50 p-6 rounded-xl shadow-md border border-amber-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2"><Clock /> Exam in Progress</h2>
                            <p className="text-amber-700 mt-1">You have an unfinished attempt for <strong>{inProgressExam.examName}</strong>.</p>
                        </div>
                        <button onClick={() => navigate(`/test/${inProgressExam.examId}`)} className="flex-shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg transition">
                            <PlayCircle size={16} /> Resume Exam
                        </button>
                    </div>
                )}

                {(categories || []).map(category => {
                    const practiceExam = (exams || []).find(e => e.id === category.practiceExamId);
                    const certExam = (exams || []).find(e => e.id === category.certificationExamId);
                    if (!practiceExam || !certExam) return null;

                    const isCertPurchased = paidExamIds.includes(certExam.productSku) || isSubscribed;
                    const certResults = results.filter(r => r.examId === certExam.id);
                    const hasPassedCert = certResults.some(r => r.score >= certExam.passScore);
                    const attemptsUsed = certResults.length;
                    // FIX: Make attempt calculation more robust to prevent negative numbers.
                    const attemptsLeft = Math.max(0, 3 - attemptsUsed);
                    const attemptsExceeded = attemptsLeft === 0;
                    
                    const priceData = examPrices ? examPrices[certExam.productSku] : null;

                    return (
                        <div key={category.id} id={category.id} className="bg-white rounded-xl shadow-md overflow-hidden scroll-mt-24">
                            <div className="h-2 bg-cyan-500"></div>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-slate-800">{category.name}</h2>
                                <p className="text-slate-500 mt-1 mb-4">
                                    <DescriptionWithHashtags text={category.description} />
                                </p>
                                {priceData && <StarRating rating={priceData.avgRating || 0} count={priceData.reviewCount || 0} />}

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><FlaskConical size={16} /> Free Practice</h3>
                                        <p className="text-sm text-slate-500 mt-2 flex-grow">{practiceExam.numberOfQuestions} questions, {practiceExam.durationMinutes} mins</p>
                                        <button onClick={() => navigate(`/test/${practiceExam.id}`)} className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:-translate-y-0.5 shadow-md hover:shadow-lg">
                                            Start Practice
                                        </button>
                                    </div>
                                    
                                    <div className={`p-4 rounded-lg border flex flex-col ${isCertPurchased ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                         <h3 className="font-bold text-slate-700 flex items-center gap-2"><Trophy size={16}/> Certification Exam</h3>
                                         <p className="text-sm text-slate-500 mt-2 flex-grow">{certExam.numberOfQuestions} questions, {certExam.durationMinutes} mins</p>
                                         {isCertPurchased ? (
                                            <>
                                                {hasPassedCert ? (
                                                    <div className="mt-4 text-center text-green-700 bg-green-100 p-2 rounded-md font-semibold">Passed!</div>
                                                ) : attemptsExceeded ? (
                                                    <div className="mt-4 text-center text-red-700 bg-red-100 p-2 rounded-md font-semibold">Attempts Used</div>
                                                ) : (
                                                    <button onClick={() => navigate(`/test/${certExam.id}`)} className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:-translate-y-0.5 shadow-md hover:shadow-lg">
                                                        Start Exam ({attemptsLeft} left)
                                                    </button>
                                                )}
                                            </>
                                         ) : (
                                            certExam.productSlug ? (
                                                <a href={`/#/checkout/${certExam.productSlug}`} className="mt-4 w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:-translate-y-0.5 shadow-md hover:shadow-lg">
                                                    {priceData && priceData.price > 0 ? `Buy Exam - $${priceData.price}` : 'Buy Exam'}
                                                </a>
                                            ) : (
                                                <button disabled className="mt-4 w-full text-center bg-slate-400 text-white font-semibold py-2 px-4 rounded-lg cursor-not-allowed">
                                                    Not Available
                                                </button>
                                            )
                                         )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <aside className="space-y-8 lg:sticky lg:top-8">
                 <div className="bg-white p-6 rounded-xl shadow-md">
                     <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BarChart className="mr-3 text-cyan-500"/> My Stats</h3>
                     {isLoadingResults ? <Spinner/> : stats ? (
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <Award className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                                <p className="font-bold text-2xl text-slate-800">{stats.completed}</p>
                                <p className="text-sm text-slate-500">Completed</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <Target className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                                <p className="font-bold text-2xl text-slate-800">{stats.avg}%</p>
                                <p className="text-sm text-slate-500">Avg. Score</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <TrendingUp className="mx-auto h-8 w-8 text-green-600 mb-2" />
                                <p className="font-bold text-2xl text-green-600">{stats.best}%</p>
                                <p className="text-sm text-green-700">Best Score</p>
                            </div>
                         </div>
                     ) : <p className="text-slate-500 text-sm">No results yet. Take an exam to see your stats!</p>}
                </div>
                <SuggestedBooksSidebar />
            </aside>
        </div>
    );
};

export default Dashboard;