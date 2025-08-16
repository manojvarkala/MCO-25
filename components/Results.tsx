import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook, AnswerReview } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Check, X, FileDown, BookUp, ShieldCheck, Sparkles } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';

const Results: React.FC = () => {
    const { testId } = ReactRouterDOM.useParams<{ testId: string }>();
    const navigate = ReactRouterDOM.useNavigate();
    const { user } = useAuth();
    const { activeOrg } = useAppContext();
    
    const [result, setResult] = useState<TestResult | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [aiFeedback, setAiFeedback] = useState<string>('');
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

    useEffect(() => {
        if (!testId || !user || !activeOrg) {
            if(!user) toast.error("Authentication session has expired.");
            else toast.error("Required data is missing.");
            navigate('/dashboard');
            return;
        }

        const fetchResultAndExam = async () => {
            setIsLoading(true);
            try {
                const foundResult = await googleSheetsService.getTestResult(user, testId);
                if (foundResult) {
                    setResult(foundResult);
                    const examConfig = activeOrg.exams.find(e => e.id === foundResult.examId);
                    if (examConfig) {
                        setExam(examConfig);
                    } else {
                        toast.error("Could not find the configuration for this exam.");
                        navigate('/dashboard');
                    }
                } else {
                    toast.error("Could not find your test results.");
                    navigate('/dashboard');
                }
            } catch (error) {
                toast.error("Failed to load results.");
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };
        fetchResultAndExam();
    }, [testId, user, activeOrg, navigate]);

    const handleGenerateFeedback = async () => {
        if (!result || !exam) return;
        setIsGeneratingFeedback(true);
        const toastId = toast.loading('Generating AI feedback...');
        try {
            const incorrectAnswers = result.review.filter(r => r.userAnswer !== r.correctAnswer);
            if (incorrectAnswers.length === 0) {
                toast.success("You got all questions correct! No feedback needed.", { id: toastId });
                return;
            }

            const prompt = `I am a student preparing for the ${exam.name}. I answered the following questions incorrectly. Please provide personalized feedback for me. For each question, explain why the correct answer is right and what specific topic I should study to improve. Keep the tone encouraging and educational. Structure your response clearly with headings for each question.

Here are the questions I got wrong:
${incorrectAnswers.map(item => `
---
Question: ${item.question}
Options:
${item.options.map((opt, i) => `- ${opt}`).join('\n')}
My Answer: ${item.userAnswer > -1 ? item.options[item.userAnswer] : 'Not Answered'}
Correct Answer: ${item.options[item.correctAnswer]}
---
`).join('\n')}

Please provide a summary of the key areas I need to focus on based on these errors.
`;
            const feedback = await googleSheetsService.getAIFeedback(prompt);
            setAiFeedback(feedback);
            toast.success("AI feedback generated!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to generate feedback.", { id: toastId });
        } finally {
            setIsGeneratingFeedback(false);
        }
    };
    
    const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string } => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let domainKey: keyof RecommendedBook['affiliateLinks'] = 'com';
        let domainName = 'Amazon.com';

        const gccTimezones = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat'];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            domainKey = 'in'; domainName = 'Amazon.in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            domainKey = 'ae'; domainName = 'Amazon.ae';
        }
        
        const url = book.affiliateLinks[domainKey];
        return !url ? { url: book.affiliateLinks.com, domainName: 'Amazon.com' } : { url, domainName };
    };


    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-md"><LogoSpinner /><p className="mt-4 text-slate-600">Calculating your results...</p></div>;
    }
    
    if (!result || !exam) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-md"><p>Could not load results.</p></div>
    }
    
    const isPass = result.score >= exam.passScore;
    const isPaid = exam.price > 0;
    const scoreColor = isPass ? 'text-green-600' : 'text-red-600';
    const isAdmin = !!user?.isAdmin;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Results for {exam.name}</h1>
            
            <div className={`text-center border-2 ${isPass ? 'border-green-200' : 'border-red-200'} bg-slate-50 rounded-lg p-6 mb-8`}>
                <p className="text-lg text-slate-600">Your Score</p>
                <p className={`text-7xl font-bold ${scoreColor}`}>{result.score}%</p>
                <p className="text-slate-500 mt-2">({result.correctCount} out of {result.totalQuestions} correct)</p>
                <p className={`mt-4 text-xl font-semibold ${scoreColor}`}>{isPass ? 'Congratulations, you passed!' : 'Unfortunately, you did not pass.'}</p>
            </div>

            {((isPaid && isPass) || isAdmin) && (
                <div className="text-center mb-8">
                    <button
                        onClick={() => navigate(`/certificate/${result.testId}`)}
                        className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
                    >
                        <FileDown size={20} />
                        <span>{isAdmin && !isPass ? "View Certificate (Admin Override)" : "Download Your Certificate"}</span>
                    </button>
                </div>
            )}
            
            {!isPass && (
                <div className="text-center mb-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <h2 className="text-xl font-semibold text-amber-800 mb-4">Need some help?</h2>
                    <p className="text-amber-700 max-w-2xl mx-auto mt-2 mb-4">Don't worry, practice makes perfect. Use our AI-powered tool to get a personalized study plan based on the questions you missed.</p>
                     <button
                        onClick={handleGenerateFeedback}
                        disabled={isGeneratingFeedback}
                        className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-amber-300"
                    >
                        {isGeneratingFeedback ? <Spinner /> : <Sparkles size={20} />}
                        <span>{isGeneratingFeedback ? 'Generating...' : 'Get AI-Powered Feedback'}</span>
                    </button>
                </div>
            )}

            {isGeneratingFeedback && (
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <LogoSpinner />
                    <p className="mt-2 text-slate-600">Our AI is analyzing your results... this may take a moment.</p>
                </div>
            )}

            {aiFeedback && (
                 <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                    <h2 className="text-2xl font-semibold text-slate-700 mb-4 flex items-center gap-2"><Sparkles className="text-cyan-500" /> AI Study Guide</h2>
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap">{aiFeedback}</div>
                </div>
            )}
            
            {(isPaid && !exam.recommendedBook) && (
                <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-lg mt-8">
                        <h2 className="text-xl font-semibold text-slate-700">Answer Review Not Available</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto mt-2">To protect the integrity of the certification exam and ensure fairness for all candidates, a detailed answer review is not provided for paid tests.</p>
                </div>
            )}

            {exam.recommendedBook && (() => {
                const { url, domainName } = getGeoAffiliateLink(exam.recommendedBook!);
                return (
                    <div className="text-center p-6 bg-blue-50 border border-blue-200 rounded-lg mt-8">
                        <h2 className="text-xl font-semibold text-blue-800 mb-4">Recommended Study Material</h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-left">
                            <BookCover title={exam.recommendedBook!.title} className="w-32 h-40 rounded-lg shadow-md flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{exam.recommendedBook!.title}</h3>
                                <p className="text-slate-600 mt-1 mb-4 max-w-md">{exam.recommendedBook!.description}</p>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    aria-label={`Buy ${exam.recommendedBook!.title} on ${domainName}`}
                                    className="inline-flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
                                >
                                    <BookUp size={20} />
                                    <span>Buy on {domainName}</span>
                                </a>
                                <p className="text-xs text-slate-500 mt-2 max-w-md">
                                    As an Amazon Associate, we earn from qualifying purchases. This is a geo-targeted affiliate link.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })()} 
            
            {!isPaid && (
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold text-slate-700 mb-4">Answer Review</h2>
                    <div className="space-y-6">
                        {result.review.map((item, index) => (
                            <div key={item.questionId} className="border border-slate-200 rounded-lg p-4">
                                <p className="font-semibold text-slate-800 mb-3">{index + 1}. {item.question}</p>
                                <div className="space-y-2">
                                    {item.options.map((option, optionIndex) => {
                                        const isUserAnswer = item.userAnswer === optionIndex;
                                        const isCorrectAnswer = item.correctAnswer === optionIndex;
                                        let bgClass = 'bg-slate-50';
                                        if (isCorrectAnswer) bgClass = 'bg-green-100 border-green-400';
                                        else if (isUserAnswer && !isCorrectAnswer) bgClass = 'bg-red-100 border-red-400';

                                        return (
                                            <div key={optionIndex} className={`flex items-center p-3 rounded border ${bgClass}`}>
                                                {isUserAnswer && !isCorrectAnswer && <X size={18} className="text-red-600 mr-2 shrink-0" />}
                                                {isCorrectAnswer && <Check size={18} className="text-green-600 mr-2 shrink-0" />}
                                                <span className="text-slate-700">{option}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-center mt-8">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-slate-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default Results;