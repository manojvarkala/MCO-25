import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { FlaskConical, Trophy, RefreshCw, Star, BarChart, Clock, PlayCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import toast from 'react-hot-toast';
import SuggestedBooksSidebar from './SuggestedBooksSidebar.tsx';

const StarRating: React.FC<{ rating: number; count: number; }> = ({ rating, count }) => {
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

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, token, paidExamIds, examPrices, isSubscribed } = useAuth();
    const { activeOrg, isInitializing, inProgressExam } = useAppContext();
    const [results, setResults] = React.useState<TestResult[]>([]);
    const [isLoadingResults, setIsLoadingResults] = React.useState(true);
    const [stats, setStats] = React.useState<{ avg: number; best: number; completed: number } | null>(null);

    const mainSiteBaseUrl = React.useMemo(() => {
        if (activeOrg) {
            return `https://www.${activeOrg.website}`;
        }
        const hostname = window.location.hostname;
        if (hostname.includes('coding-online.net')) return 'https://www.coding-online.net';
        if (hostname.includes('annapoornainfo.com')) return 'https://www.annapoornainfo.com';
        return '';
    }, [activeOrg]);

    const syncUrl = `${mainSiteBaseUrl}/my-account/`;

    React.useEffect(() => {
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
    
    const { examProductCategories: categories, exams } = activeOrg;
    
    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user.name}!</h1>
                        <p className="text-slate-500 mt-1">Ready to ace your next exam?</p>
                    </div>
                    <a href={syncUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition">
                        <RefreshCw size={16} /> Sync My Exams
                    </a>
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

                {categories.map(category => {
                    const practiceExam = exams.find(e => e.id === category.practiceExamId);
                    const certExam = exams.find(e => e.id === category.certificationExamId);
                    if (!practiceExam || !certExam) return null;

                    const isCertPurchased = paidExamIds.includes(certExam.productSku) || isSubscribed;
                    const certResults = results.filter(r => r.examId === certExam.id);
                    const hasPassedCert = certResults.some(r => r.score >= certExam.passScore);
                    const attemptsUsed = certResults.length;
                    const attemptsExceeded = attemptsUsed >= 3;
                    
                    const priceData = examPrices ? examPrices[certExam.productSku] : null;

                    return (
                        <div key={category.id} className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-2xl font-bold text-slate-800">{category.name}</h2>
                            <p className="text-slate-500 mt-1 mb-4">{category.description}</p>
                            {priceData && <StarRating rating={priceData.avgRating || 0} count={priceData.reviewCount || 0} />}

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><FlaskConical size={16} /> Free Practice</h3>
                                    <p className="text-sm text-slate-500 mt-2 flex-grow">{practiceExam.numberOfQuestions} questions, {practiceExam.durationMinutes} mins</p>
                                    <button onClick={() => navigate(`/test/${practiceExam.id}`)} className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition">
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
                                                <button onClick={() => navigate(`/test/${certExam.id}`)} className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition">
                                                    Start Exam ({3 - attemptsUsed} left)
                                                </button>
                                            )}
                                        </>
                                     ) : (
                                        <a href={`/#/checkout/${certExam.productSlug}`} className="mt-4 w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition">
                                            {priceData && priceData.price > 0 ? `Buy Exam - $${priceData.price}` : 'Buy Exam'}
                                        </a>
                                     )}
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
                         <div className="space-y-3 text-slate-600">
                             <div className="flex justify-between items-baseline"><span >Exams Completed</span> <span className="font-bold text-2xl text-slate-800">{stats.completed}</span></div>
                             <div className="flex justify-between items-baseline"><span>Average Score</span> <span className="font-bold text-2xl text-slate-800">{stats.avg}%</span></div>
                             <div className="flex justify-between items-baseline"><span>Best Score</span> <span className="font-bold text-2xl text-green-600">{stats.best}%</span></div>
                         </div>
                     ) : <p className="text-slate-500 text-sm">No results yet. Take an exam to see your stats!</p>}
                </div>
                <SuggestedBooksSidebar />
            </aside>
        </div>
    );
};

export default Dashboard;
