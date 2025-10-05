import React, { FC, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Award, BarChart2, CheckCircle, ChevronDown, ChevronUp, Download, Send, Sparkles, Star, XCircle, BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BookCover from '../assets/BookCover.tsx';

type CertVisibility = 'NONE' | 'USER_EARNED' | 'ADMIN_OVERRIDE';

const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string } => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let preferredKey: keyof RecommendedBook['affiliateLinks'] = 'com';
    let preferredDomain = 'Amazon.com';

    const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
    if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
        preferredKey = 'in';
        preferredDomain = 'Amazon.in';
    } else if (gccTimezones.some(tz => timeZone === tz)) {
        preferredKey = 'ae';
        preferredDomain = 'Amazon.ae';
    }
    
    const preferredUrl = book.affiliateLinks[preferredKey];
    if (preferredUrl && preferredUrl.trim() !== '') {
        return { url: preferredUrl, domainName: preferredDomain };
    }
    
    if (book.affiliateLinks.com && book.affiliateLinks.com.trim() !== '') {
        return { url: book.affiliateLinks.com, domainName: 'Amazon.com' };
    }

    const fallbackOrder: (keyof RecommendedBook['affiliateLinks'])[] = ['in', 'ae'];
    for (const key of fallbackOrder) {
         if (book.affiliateLinks[key] && book.affiliateLinks[key].trim() !== '') {
            const domain = key === 'in' ? 'Amazon.in' : 'Amazon.ae';
            return { url: book.affiliateLinks[key], domainName: domain };
         }
    }
    
    return { url: book.affiliateLinks.com || '', domainName: 'Amazon.com' };
};


const Results: FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { user, token, isSubscribed, paidExamIds, isEffectivelyAdmin } = useAuth();
    const { activeOrg, suggestedBooks } = useAppContext();

    const [result, setResult] = useState<TestResult | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
    const reviewSubmittedKey = `review_submitted_${testId}`;

    useEffect(() => {
        if (user && testId && activeOrg) {
            const testResult = googleSheetsService.getTestResult(user, testId);
            if (testResult) {
                setResult(testResult);
                const examConfig = activeOrg.exams.find(e => e.id === testResult.examId);
                setExam(examConfig || null);
            } else {
                toast.error("Test result not found.");
                navigate('/dashboard');
            }
            setIsLoading(false);
        }
    }, [testId, user, activeOrg, navigate]);

    const isPassed = useMemo(() => {
        if (!result || !exam) return false;
        return result.score >= exam.passScore;
    }, [result, exam]);

    const certificateVisibility = useMemo((): CertVisibility => {
        if (!exam) return 'NONE';
        const normallyVisible = isPassed && !exam.isPractice && exam.certificateEnabled;

        if (isEffectivelyAdmin) {
            return normallyVisible ? 'USER_EARNED' : 'ADMIN_OVERRIDE';
        }

        return normallyVisible ? 'USER_EARNED' : 'NONE';
    }, [exam, isPassed, isEffectivelyAdmin]);
    
    const canGetAIFeedback = useMemo(() => {
        if (!exam || !result || isPassed) return false;
        if (isSubscribed) return true;
        // For non-subscribers, allow if they purchased the exam and haven't passed it yet.
        return paidExamIds.includes(exam.productSku);
    }, [exam, result, isPassed, isSubscribed, paidExamIds]);

    const recommendedBooksForExam = useMemo(() => {
        if (!exam || !exam.recommendedBookIds || !suggestedBooks) return [];
        return suggestedBooks.filter(book => exam.recommendedBookIds.includes(book.id));
    }, [exam, suggestedBooks]);


    const generateAIFeedback = async () => {
        if (!result || !exam) return;
        setIsAiLoading(true);
        const toastId = toast.loading('Generating your personalized study guide...');

        try {
            const incorrectQuestions = result.review.filter(item => item.userAnswer !== item.correctAnswer);
            if (incorrectQuestions.length === 0) {
                toast.success("Great job, you didn't have any incorrect answers!", { id: toastId });
                setAiFeedback("No incorrect answers to analyze. Keep up the great work!");
                return;
            }

            const prompt = `
                You are an expert tutor for medical coding certification exams.
                A student just took a practice test for the "${exam.name}" exam and got the following questions wrong.
                For each question, provide a detailed but concise explanation of why the correct answer is right and why the student's chosen answer was wrong.
                Focus on the core concepts being tested. Use clear, easy-to-understand language.
                Organize the feedback by question. Use markdown for formatting.

                Here are the incorrect questions and the student's answers:
                ${incorrectQuestions.map((q, index) => `
                ---
                Question ${index + 1}: ${q.question}
                Options:
                ${q.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}
                Student's Answer: ${q.options[q.userAnswer] || 'Not Answered'}
                Correct Answer: ${q.options[q.correctAnswer]}
                ---
                `).join('\n')}

                Please provide your expert feedback below.
            `;
            const feedback = await googleSheetsService.getAIFeedback(prompt);
            setAiFeedback(feedback);
            toast.success("AI Study Guide generated!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate AI feedback.', { id: toastId });
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const downloadAiFeedback = () => {
        if (!aiFeedback || !exam || !user) return;
        
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`AI Study Guide for ${exam.name}`, 14, 22);
            doc.setFontSize(11);
            doc.text(`Generated for: ${user.name}`, 14, 30);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

            const splitText = doc.splitTextToSize(aiFeedback, 180);
            autoTable(doc, {
                startY: 45,
                head: [['Personalized Feedback']],
                body: splitText.map((line: string) => [line]),
                theme: 'grid',
                headStyles: { fillColor: [8, 145, 178] }, // cyan-600
                styles: { cellPadding: 3, fontSize: 10 },
            });
            doc.save(`AI-Study-Guide-${exam.name.replace(/\s+/g, '_')}.pdf`);
            toast.success("Feedback downloaded!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Could not download PDF.");
        }
    };
    
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error("Please select a star rating.");
            return;
        }
        if (!token || !exam) return;
        setIsSubmittingReview(true);
        try {
            await googleSheetsService.submitReview(token, exam.id, rating, reviewText);
            toast.success("Thank you for your review!");
            sessionStorage.setItem(reviewSubmittedKey, 'true');
        } catch (error: any) {
            toast.error(error.message || "Failed to submit review.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const reviewAlreadySubmitted = sessionStorage.getItem(reviewSubmittedKey) === 'true';

    if (isLoading || !result || !exam) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading your results...</p></div>;
    }

    const toggleQuestion = (id: number) => {
        setExpandedQuestion(expandedQuestion === id ? null : id);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className={`p-8 rounded-xl text-white text-center shadow-lg ${isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                {isPassed ? <CheckCircle className="mx-auto h-16 w-16" /> : <XCircle className="mx-auto h-16 w-16" />}
                <h1 className="text-4xl font-extrabold mt-4">{exam.name}</h1>
                <p className="text-2xl mt-2">{isPassed ? 'Congratulations, You Passed!' : 'Further Study Recommended'}</p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Actions */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BarChart2 className="mr-3 text-cyan-500" /> Your Score</h3>
                        <div className="text-center">
                            <p className={`text-7xl font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>{result.score.toFixed(0)}<span className="text-4xl">%</span></p>
                            <p className="text-slate-500">Passing Score: {exam.passScore}%</p>
                        </div>
                        <div className="mt-6 space-y-3 text-sm">
                            <div className="flex justify-between p-2 bg-slate-50 rounded-md"><span>Correct Answers:</span><span className="font-semibold">{result.correctCount} / {result.totalQuestions}</span></div>
                            <div className="flex justify-between p-2 bg-slate-50 rounded-md"><span>Incorrect Answers:</span><span className="font-semibold">{result.totalQuestions - result.correctCount} / {result.totalQuestions}</span></div>
                            <div className="flex justify-between p-2 bg-slate-50 rounded-md"><span>Date Completed:</span><span className="font-semibold">{new Date(result.timestamp).toLocaleDateString()}</span></div>
                        </div>
                    </div>
                    
                    {certificateVisibility !== 'NONE' && (
                        <button 
                            onClick={() => navigate(`/certificate/${result.testId}`)} 
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
                        >
                            <Award size={20} /> 
                            {certificateVisibility === 'ADMIN_OVERRIDE' ? 'View Certificate (Admin)' : 'Download Your Certificate'}
                        </button>
                    )}

                    {!reviewAlreadySubmitted && (
                         <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Star className="mr-3 text-yellow-400" /> Rate Your Experience</h3>
                            <form onSubmit={handleReviewSubmit}>
                                <div className="flex justify-center mb-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} type="button" onClick={() => setRating(star)} className="text-yellow-400 focus:outline-none">
                                            <Star size={32} className={rating >= star ? 'fill-current' : ''} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Share your thoughts... (optional)"
                                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                    rows={3}
                                />
                                <button type="submit" disabled={isSubmittingReview || rating === 0} className="w-full mt-3 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                    {isSubmittingReview ? <Spinner/> : <Send size={16}/>} Submit Review
                                </button>
                            </form>
                        </div>
                    )}
                </div>
                
                {/* Right Column: Feedback, Review, & Books */}
                <div className="lg:col-span-2 space-y-8">
                    {canGetAIFeedback && (
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center"><Sparkles className="mr-3 text-amber-500" /> AI-Powered Feedback</h3>
                            <p className="text-sm text-slate-500 mb-4">Get a personalized study guide based on your incorrect answers to help you improve.</p>
                             {!aiFeedback && (
                                <button onClick={generateAIFeedback} disabled={isAiLoading} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition disabled:bg-slate-400">
                                    {isAiLoading ? <Spinner/> : <Sparkles size={16}/>} Generate Study Guide
                                </button>
                             )}
                             {aiFeedback && (
                                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiFeedback.replace(/\n/g, '<br />') }}></div>
                                </div>
                             )}
                              {aiFeedback && (
                                <button onClick={downloadAiFeedback} className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <Download size={16}/> Download as PDF
                                </button>
                             )}
                        </div>
                    )}
                    
                    {exam.isPractice && (
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Answer Review</h3>
                            <div className="space-y-3">
                                {result.review.map(item => (
                                    <div key={item.questionId} className="bg-slate-50 rounded-lg border border-slate-200">
                                        <button onClick={() => toggleQuestion(item.questionId)} className="w-full text-left p-3 flex justify-between items-center">
                                            <p className="font-semibold text-slate-800 flex-grow pr-4">{item.question}</p>
                                            {item.userAnswer === item.correctAnswer ? <CheckCircle className="text-green-500 flex-shrink-0"/> : <XCircle className="text-red-500 flex-shrink-0"/>}
                                            {expandedQuestion === item.questionId ? <ChevronUp className="ml-2"/> : <ChevronDown className="ml-2"/>}
                                        </button>
                                        {expandedQuestion === item.questionId && (
                                            <div className="p-4 border-t border-slate-200 text-sm">
                                                <p><strong>Your Answer:</strong> <span className={item.userAnswer === item.correctAnswer ? 'text-green-700' : 'text-red-700'}>{item.options[item.userAnswer] || 'Not Answered'}</span></p>
                                                <p><strong>Correct Answer:</strong> <span className="text-green-700">{item.options[item.correctAnswer]}</span></p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {recommendedBooksForExam.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BookOpen className="mr-3 text-cyan-500" /> Recommended Study Material</h3>
                            <div className="flex flex-wrap gap-4">
                                {recommendedBooksForExam.map(book => {
                                    const { url, domainName } = getGeoAffiliateLink(book);
                                    if (!url) return null;
                                    return (
                                        <div key={book.id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 w-full sm:w-56 flex-shrink-0">
                                            <BookCover book={book} className="w-full h-32"/>
                                            <div className="p-3">
                                                <h4 className="font-bold text-slate-800 text-xs mb-2 leading-tight">{book.title}</h4>
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center text-xs text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-2 py-1.5 transition-colors">
                                                    Buy on {domainName}
                                                </a>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Results;