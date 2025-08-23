import * as React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { BookCopy, History as HistoryIcon, FlaskConical, Eye, FileText, BarChart, BadgePercent, Trophy, ArrowRight, Home, RefreshCw, Star, Zap, CheckCircle, Lock, Edit, Save, X, ShoppingCart, AlertTriangle, Award, Wifi, List, Clock, Target, Repeat, PlayCircle } from 'lucide-react';
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
                {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} size={16} className="text-slate-300" />)}
            </div>
            <span className="text-xs text-slate-500">({count} reviews)</span>
        </div>
    );
};


const Dashboard: React.FC = () => {
    const navigate = ReactRouterDOM.useNavigate();
    const { user, paidExamIds, isSubscribed, updateUserName, token, examPrices } = useAuth();
    const { activeOrg, inProgressExam } = useAppContext();
    const [results, setResults] = React.useState<TestResult[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [stats, setStats] = React.useState({ avgScore: 0, bestScore: 0, examsTaken: 0 });
    const [practiceStats, setPracticeStats] = React.useState({ attemptsTaken: 0, attemptsAllowed: 0 });
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [isSavingName, setIsSavingName] = React.useState(false);
    const [name, setName] = React.useState(user?.name || '');

    const loginUrl = 'https://www.coding-online.net/exam-login/';
    const appDashboardPath = '/dashboard';
    const syncUrl = `${loginUrl}?redirect_to=${encodeURIComponent(appDashboardPath)}`;
    const browseExamsUrl = 'https://www.coding-online.net/exam-programs/';

    const monthlySubUrl = 'https://www.coding-online.net/product/monthly-subscription/';
    const yearlySubUrl = 'https://www.coding-online.net/product/yearly-subscription/';

    const monthlyPriceData = examPrices?.['sub-monthly'];
    const yearlyPriceData = examPrices?.['sub-yearly'];
    const bundlePriceData = examPrices?.['exam-cpc-cert-1']; // Representative bundle

    const monthlyPrice = monthlyPriceData?.price ?? 19.99;
    const monthlyRegularPrice = monthlyPriceData?.regularPrice;

    const yearlyPrice = yearlyPriceData?.price ?? 149.99;
    const yearlyRegularPrice = yearlyPriceData?.regularPrice;
    
    const bundlePrice = bundlePriceData?.price ?? 59.99;
    const bundleRegularPrice = bundlePriceData?.regularPrice;


    const processResults = (resultsData: TestResult[]) => {
        setResults(resultsData);
        if (resultsData.length > 0 && activeOrg) {
            const totalScore = resultsData.reduce((sum, r) => sum + r.score, 0);
            const avg = totalScore / resultsData.length;
            const best = Math.max(...resultsData.map(r => r.score));
            setStats({
                avgScore: parseFloat(avg.toFixed(1)),
                bestScore: best,
                examsTaken: resultsData.length
            });

            const practiceExamIds = new Set(activeOrg.exams.filter(e => e.isPractice).map(e => e.id));
            const practiceAttemptsTaken = resultsData.filter(r => practiceExamIds.has(r.examId)).length;
            setPracticeStats({ attemptsTaken: practiceAttemptsTaken, attemptsAllowed: 10 });

        } else {
            setStats({ avgScore: 0, bestScore: 0, examsTaken: 0 });
        }
    };

    React.useEffect(() => {
        if (!user || !activeOrg) {
            if (activeOrg) setIsLoading(false);
            return;
        }

        setIsLoading(true);
        // Load from local storage first for instant UI response
        const cachedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
        processResults(cachedResults);
        setIsLoading(false);

        // Then sync with server in the background
        if (token) {
            googleSheetsService.syncResults(user, token).then(() => {
                // After sync, re-read from local storage to update UI
                const updatedResults = googleSheetsService.getLocalTestResultsForUser(user.id);
                processResults(updatedResults);
            });
        }
    }, [user?.id, activeOrg, token]); // Depend on user.id to re-run if user changes

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

    const examCategories = React.useMemo(() => {
        if (!activeOrg || !results) return [];

        return activeOrg.examProductCategories.map(category => {
            const practiceExam = activeOrg.exams.find(e => e.id === category.practiceExamId);
            const certExam = activeOrg.exams.find(e => e.id === category.certificationExamId);

            if (!practiceExam || !certExam) return null;

            const isPurchased = paidExamIds.includes(certExam.productSku);
            let certStatusData = null;

            if (isPurchased) {
                const examResults = results.filter(r => r.examId === certExam.id);
                const attemptsMade = examResults.length;
                const hasPassed = examResults.some(r => r.score >= certExam.passScore);
                const bestScore = examResults.length > 0 ? Math.max(...examResults.map(r => r.score)) : null;

                let status: 'passed' | 'attempts_exceeded' | 'available' = 'available';
                if (hasPassed) {
                    status = 'passed';
                } else if (attemptsMade >= 3) {
                    status = 'attempts_exceeded';
                }
                
                certStatusData = { attemptsMade, hasPassed, bestScore, status };
            }
            
            const isPopular = certExam.productSku === 'exam-cpc-cert';

            return {
                ...category,
                practiceExam,
                certExam,
                isPurchased,
                certStatusData,
                isPopular
            };
        }).filter(Boolean); // Filter out nulls if exams weren't found
    }, [activeOrg, paidExamIds, results, examPrices]);


    if (isLoading || !activeOrg) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4">Loading your dashboard...</p></div>;
    }

    const getExamName = (examId: string) => activeOrg.exams.find(e => e.id === examId)?.name || 'Unknown Exam';
    
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

            {inProgressExam && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-center sm:text-left">
                        <div className="flex items-center gap-3">
                            <PlayCircle className="h-8 w-8 text-amber-600 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold">Exam in Progress</h3>
                                <p className="text-sm">You have an unfinished session for: <strong>{inProgressExam.examName}</strong></p>
                            </div>
                        </div>
                        <ReactRouterDOM.Link
                            to={`/test/${inProgressExam.examId}`}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                        >
                            Resume Exam
                        </ReactRouterDOM.Link>
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                     {!isSubscribed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Monthly Card */}
                            <div className="bg-gradient-to-br from-cyan-400 to-sky-600 rounded-xl shadow-lg p-6 flex flex-col text-white">
                                <h3 className="text-lg font-bold">Monthly Subscription</h3>
                                <p className="mt-2 text-sm text-sky-100 flex-grow">Unlimited practice & AI feedback.</p>
                                <div className="mt-4 flex items-baseline gap-2">
                                    {monthlyRegularPrice && monthlyRegularPrice > monthlyPrice ? (
                                        <>
                                            <span className="text-xl line-through opacity-70">${monthlyRegularPrice.toFixed(2)}</span>
                                            <span className="text-4xl font-extrabold text-white">${monthlyPrice.toFixed(2)}</span>
                                        </>
                                    ) : (
                                        <span className="text-4xl font-extrabold text-white">${monthlyPrice.toFixed(2)}</span>
                                    )}
                                    <span className="font-medium text-sky-100">/month</span>
                                </div>
                                <a href={monthlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block w-full bg-white text-cyan-600 border border-transparent rounded-md py-2 text-sm font-semibold text-center hover:bg-cyan-50">
                                    Subscribe Now
                                </a>
                            </div>

                            {/* Yearly Card */}
                            <div className="relative bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg p-6 flex flex-col">
                                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                                    <div className="bg-yellow-400 text-yellow-900 text-xs font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1">
                                        <Star size={12}/> Best Value
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold">Yearly Subscription</h3>
                                <p className="mt-2 text-sm text-indigo-100 flex-grow">Save over 35% with annual billing.</p>
                                <div className="mt-4 flex items-baseline gap-2">
                                    {yearlyRegularPrice && yearlyRegularPrice > yearlyPrice ? (
                                        <>
                                            <span className="text-xl line-through opacity-70">${yearlyRegularPrice.toFixed(2)}</span>
                                            <span className="text-4xl font-extrabold text-white">${yearlyPrice.toFixed(2)}</span>
                                        </>
                                    ) : (
                                        <span className="text-4xl font-extrabold text-white">${yearlyPrice.toFixed(2)}</span>
                                    )}
                                    <span className="font-medium text-indigo-100">/year</span>
                                </div>
                                <a href={yearlySubUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block w-full bg-white text-purple-700 border border-transparent rounded-md py-2 text-sm font-semibold text-center hover:bg-purple-100">
                                    Subscribe & Save
                                </a>
                            </div>

                             {/* New Bundle Card */}
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 flex flex-col text-white">
                                <h3 className="text-lg font-bold">Exam + Study Bundle</h3>
                                <p className="mt-2 text-sm text-emerald-100 flex-grow">Get an exam plus 1-month of premium study access.</p>
                                <div className="mt-4 flex items-baseline gap-2">
                                    {bundleRegularPrice && bundleRegularPrice > bundlePrice ? (
                                        <>
                                            <span className="text-xl line-through opacity-70">${bundleRegularPrice.toFixed(2)}</span>
                                            <span className="text-4xl font-extrabold text-white">${bundlePrice.toFixed(2)}</span>
                                        </>
                                    ) : (
                                        <span className="text-4xl font-extrabold text-white">${bundlePrice.toFixed(2)}</span>
                                    )}
                                </div>
                                <a href={browseExamsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block w-full bg-white text-green-700 border border-transparent rounded-md py-2 text-sm font-semibold text-center hover:bg-green-50">
                                    Browse Bundles
                                </a>
                            </div>
                        </div>
                    )}

                     {/* New Purchase Notification */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 text-center">
                            <RefreshCw className="text-blue-600" size={24} />
                            <div>
                                <p className="font-semibold text-blue-800">Just made a purchase or switching sites?</p>
                                <p className="text-sm text-blue-700">Click below to sync your latest data. This loads purchased exams and test history.</p>
                            </div>
                              <a
                                href={syncUrl}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                title="This takes you to our main site to securely sync your purchased exams with your account."
                            >
                                Sync My Exams
                            </a>
                        </div>
                    </div>

                    {/* My Exam Programs */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center"><BookCopy className="mr-3 text-cyan-500" /> My Exam Programs</h2>
                        {examCategories.map(category => {
                            if (!category) return null;
                            const { practiceExam, certExam, isPurchased, certStatusData, isPopular } = category;
                            
                            let certButtonContent: React.ReactNode;
                            let canTakeCertTest = false;

                            if (isPurchased && certStatusData) {
                                canTakeCertTest = certStatusData.status === 'available';
                                if (certStatusData.status === 'passed') {
                                    certButtonContent = <><CheckCircle size={16} className="mr-2"/> Passed</>;
                                } else if (certStatusData.status === 'attempts_exceeded') {
                                    certButtonContent = 'Attempts Exceeded';
                                } else if (certStatusData.attemptsMade > 0) {
                                    certButtonContent = 'Retake Exam';
                                } else {
                                    certButtonContent = 'Start Exam';
                                }
                            }
                            const ratingData = examPrices?.[certExam.productSku];

                            let bundleSku = '';
                            if (certExam.productSku === 'exam-cpc-cert') bundleSku = 'exam-cpc-cert-1';
                            else if (certExam.productSku === 'exam-cca-cert') bundleSku = 'exam-cca-cert-bundle';
                            else bundleSku = `${certExam.productSku}-1mo-addon`;
                            const bundlePriceData = examPrices?.[bundleSku];

                            const cardClasses = isPopular ? 'bg-gradient-to-br from-amber-50 via-orange-100 to-amber-200 border-amber-300' : 'bg-white border-slate-200';
                            const subCardClasses = isPopular ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
                            const bundleSubCardClasses = isPopular ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-200' : 'bg-cyan-50 border-cyan-200 ring-2 ring-cyan-100';
                            const dividerClasses = isPopular ? 'border-amber-200' : 'border-slate-200';
                            const bundleUnavailableClasses = isPopular ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400';

                            return (
                                <div key={category.id} className={`p-6 rounded-xl shadow-md border relative ${cardClasses}`}>
                                    {isPopular && (
                                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10">
                                            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                                                <Star size={12}/> Most Popular
                                            </div>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold text-slate-800">{certExam.name}</h3>
                                    {ratingData && ratingData.reviewCount && ratingData.reviewCount > 0 && (
                                        <div className="mt-2 mb-2">
                                            <StarRating rating={ratingData.avgRating || 0} count={ratingData.reviewCount} />
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-500 mt-1 mb-4">{certExam.description}</p>
                                    
                                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 ${dividerClasses}`}>
                                        <div className={`flex flex-col justify-between p-4 rounded-lg border h-full ${subCardClasses}`}>
                                            <div className="flex-grow">
                                                <h4 className="font-semibold text-slate-700 flex items-center gap-2"><FlaskConical size={16} /> Free Practice Exam</h4>
                                                <div className="mt-2 text-xs">
                                                    {isSubscribed ? (
                                                        <div>
                                                            <span className="text-xs line-through text-slate-500">10 Free Attempts</span>
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                <Star size={12} className="mr-1"/> Unlimited Attempts
                                                            </span>
                                                        </div>
                                                    ) : (
                                                         <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                                                            10 Free Attempts
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="text-xs text-slate-600 mt-2 space-y-1">
                                                    <li className="flex items-center gap-2"><List size={14}/> {practiceExam.numberOfQuestions} questions</li>
                                                    <li className="flex items-center gap-2"><Clock size={14}/> {practiceExam.durationMinutes} minutes</li>
                                                    <li className="flex items-center gap-2"><Target size={14}/> {practiceExam.passScore}% pass score</li>
                                                </ul>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/test/${practiceExam.id}`)}
                                                className="mt-3 w-full bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition flex items-center justify-center"
                                            >
                                                <Zap size={16} className="mr-2" />
                                                Start Practice
                                            </button>
                                        </div>
                                        
                                        <div className={`flex flex-col justify-between p-4 rounded-lg border h-full ${subCardClasses}`}>
                                            <div className="flex-grow">
                                                <h4 className="font-semibold text-slate-700 flex items-center gap-2"><Trophy size={16} /> Certification Exam</h4>
                                                <ul className="text-xs text-slate-600 mt-2 space-y-1">
                                                    <li className="flex items-center gap-2"><List size={14}/> {certExam.numberOfQuestions} questions</li>
                                                    <li className="flex items-center gap-2"><Clock size={14}/> {certExam.durationMinutes} minutes</li>
                                                    <li className="flex items-center gap-2"><Target size={14}/> {certExam.passScore}% passing score</li>
                                                    <li className="flex items-center gap-2"><Repeat size={14}/> 3 attempts included</li>
                                                </ul>
                                            </div>

                                            {isPurchased && certStatusData ? (
                                                <div className="mt-3">
                                                    <div className="flex justify-between items-center text-xs text-slate-600 mb-2">
                                                        <span>Best: <span className="font-bold">{certStatusData.bestScore ?? 'N/A'}%</span></span>
                                                        <span>Attempts: <span className="font-bold">{certStatusData.attemptsMade}/3</span></span>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/test/${certExam.id}`)}
                                                        disabled={!canTakeCertTest}
                                                        className="w-full flex items-center justify-center bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                                                    >
                                                        {certButtonContent}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-3 flex flex-col text-center">
                                                    <div className="my-2">
                                                        {certExam.regularPrice && certExam.regularPrice > certExam.price ? (
                                                            <div>
                                                                <span className="text-2xl font-bold text-green-600">${certExam.price.toFixed(2)}</span>
                                                                <span className="text-sm text-slate-500 line-through ml-2">${certExam.regularPrice.toFixed(2)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-2xl font-bold text-cyan-600">${certExam.price.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                    {(() => {
                                                        const priceData = examPrices?.[certExam.productSku];
                                                        const url = priceData?.productId 
                                                            ? `https://www.coding-online.net/cart/?add-to-cart=${priceData.productId}`
                                                            : browseExamsUrl;
                                                        return (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="mt-auto w-full flex items-center justify-center bg-yellow-500 text-white text-sm font-bold py-2 px-2 rounded-lg hover:bg-yellow-600 transition"
                                                            >
                                                                Buy Exam
                                                            </a>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {bundlePriceData ? (() => {
                                            const bundleUrl = bundlePriceData.productId
                                                ? `https://www.coding-online.net/cart/?add-to-cart=${bundlePriceData.productId}`
                                                : browseExamsUrl;
                                            return (
                                                <div className={`flex flex-col justify-between p-4 rounded-lg border h-full ${bundleSubCardClasses}`}>
                                                    <div className="flex-grow">
                                                        <h4 className={`font-semibold flex items-center gap-2 ${isPopular ? 'text-amber-800' : 'text-cyan-700'}`}><ShoppingCart size={16}/> Exam + Study Bundle</h4>
                                                        <p className="text-xs text-slate-600 mt-2">Get the exam plus 1-month of premium access to all practice tests & AI feedback.</p>
                                                    </div>
                                                    <div className="mt-3 flex flex-col text-center">
                                                        <div className="my-2">
                                                            <span className={`text-2xl font-bold ${isPopular ? 'text-amber-700' : 'text-cyan-600'}`}>{`$${bundlePriceData.price.toFixed(2)}`}</span>
                                                        </div>
                                                        <a
                                                            href={bundleUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`mt-auto w-full flex items-center justify-center text-white text-sm font-bold py-2 px-2 rounded-lg transition ${isPopular ? 'bg-orange-500 hover:bg-orange-600' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                                                        >
                                                            Buy Bundle
                                                        </a>
                                                    </div>
                                                </div>
                                            )
                                        })() : (
                                            <div className={`flex flex-col items-center justify-center p-4 rounded-lg border h-full text-center text-sm ${bundleUnavailableClasses}`}>
                                                <p>Bundle option not available for this exam.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                   

                    {/* History Section */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-4"><HistoryIcon className="mr-3 text-cyan-500" /> My Exam History</h2>
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