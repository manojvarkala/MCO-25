import React, { FC, useEffect, useState, useMemo, useRef, useCallback } from 'react';
// FIX: Refactored to use react-router-dom v5 to resolve module export errors.
import { useParams, useHistory } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Award, BarChart2, CheckCircle, ChevronDown, ChevronUp, Download, Send, Sparkles, Star, XCircle, BookOpen, AlertTriangle, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import BookCover from '../assets/BookCover.tsx';
import ShareableResult from './ShareableResult.tsx';
import ShareButtons from './ShareButtons.tsx';

type UserCertVisibility = 'NONE' | 'USER_EARNED' | 'REVIEW_PENDING';

const getGeoAffiliateLink = (book: RecommendedBook): { url: string; domainName: string } | null => {
    // FIX: Added a bulletproof safety check. If the affiliateLinks object is missing,
    // the function will now return null instead of crashing the application.
    if (!book.affiliateLinks) {
        return null;
    }

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
    
    // Return null if no valid URLs are found after all checks.
    return null;
};


const Results: FC = () => {
    const { testId } = useParams<{ testId: string }>();
    // FIX: Replaced useNavigate with useHistory for v5 compatibility.
    const history = useHistory();
    const { user, token, isSubscribed, paidExamIds, isEffectivelyAdmin } = useAuth();
    const { activeOrg, suggestedBooks } = useAppContext();

    const [result, setResult] = useState<TestResult | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(true);
    const [processingMessage, setProcessingMessage] = useState('Evaluating your answers...');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
    const reviewSubmittedKey = `review_submitted_${testId}`;
    
    const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
    const shareableResultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user && testId && activeOrg) {
            const testResult = googleSheetsService.getTestResult(user, testId);
            if (testResult) {
                setResult(testResult);
                const examConfig = activeOrg.exams.find(e => e.id === testResult.examId);
                setExam(examConfig || null);
            } else {
                toast.error("Test result not found.");
                history.push('/dashboard');
            }
            setIsLoading(false);
        }
    }, [testId, user, activeOrg, history]);
    
    useEffect(() => {
        if (!isLoading) {
            const messages = [
                "Cross-referencing with exam standards...",
                "Calculating final score...",
                "Finalizing report..."
            ];
            let messageIndex = 0;
            const interval = setInterval(() => {
                setProcessingMessage(messages[messageIndex]);
                messageIndex++;
                if (messageIndex >= messages.length) {
                    clearInterval(interval);
                }
            }, 1200);

            const timer = setTimeout(() => {
                setIsProcessing(false);
            }, 4500); // Total processing simulation time

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [isLoading]);

    const isPassed = useMemo(() => {
        if (!result || !exam) return false;
        return result.score >= exam.passScore;
    }, [result, exam]);

    const userCertificateVisibility = useMemo((): UserCertVisibility => {
        if (!exam || !result || !isPassed || !exam.certificateEnabled) {
            return 'NONE';
        }
        const requiresReview = exam.isProctored && result.proctoringViolations && result.proctoringViolations > 0;
        return requiresReview ? 'REVIEW_PENDING' : 'USER_EARNED';
    }, [exam, result, isPassed]);
    
    const canGetAIFeedback = useMemo(() => {
        if (!exam || !result || isPassed) return false;
        if (isSubscribed) return true;
        return paidExamIds.includes(exam.productSku);
    }, [exam, result, isPassed, isSubscribed, paidExamIds]);

    const recommendedBooksForExam = useMemo(() => {
        if (!exam || !exam.recommendedBookIds || !suggestedBooks) return [];
        return suggestedBooks.filter(book => exam.recommendedBookIds.includes(book.id));
    }, [exam, suggestedBooks]);


    const generateAIFeedback = async () => {
        if (!result || !exam || !token) return;
        setIsAiLoading(true);
        const toastId = toast.loading('Generating your personalized study guide...');

        try {
            const incorrectQuestions = result.review.filter(item => item.userAnswer !== item.correctAnswer);
            if (incorrectQuestions.length === 0) {
                toast.success("Great job, you didn't have any incorrect answers!", { id: toastId });
                setAiFeedback("No incorrect answers to analyze. Keep up the great work!");
                setIsAiLoading(false);
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
            const feedback = await googleSheetsService.getAIFeedback(prompt, token);
            
            if (feedback.startsWith("We're sorry")) {
                setAiFeedback(feedback);
                toast.error("AI Feedback Unavailable", { id: toastId });
            } else {
                setAiFeedback(feedback);
                toast.success("AI Study Guide generated!", { id: toastId });
            }
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
                headStyles: { fillColor: [8, 145, 178] },
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
        if (rating === 0) { toast.error("Please select a star rating."); return; }
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

    const generateImageBlob = useCallback(async (): Promise<Blob | null> => {
        if (!shareableResultRef.current) {
            toast.error("Could not generate shareable image component.");
            return null;
        }
        setIsGeneratingShareImage(true);
        const toastId = toast.loading('Generating your shareable image...');
    
        try {
            const canvas = await html2canvas(shareableResultRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
                logging: false,
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            toast.dismiss(toastId);
            if (!blob) {
                toast.error("Failed to create image from canvas.");
                return null;
            }
            return blob;
        } catch (error) {
            console.error("html2canvas error:", error);
            toast.error("Could not generate image.", { id: toastId });
            return null;
        } finally {
            setIsGeneratingShareImage(false);
        }
    }, [shareableResultRef, user, exam, result]);

    const handleDownloadImage = async () => {
        if (isGeneratingShareImage) return;
        const blob = await generateImageBlob();
        if (!blob) return;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'exam-result.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success("Image downloaded! You can now attach it to your post.");
    };

    const reviewAlreadySubmitted = sessionStorage.getItem(reviewSubmittedKey) === 'true';

    if (isLoading || !result || !exam || !activeOrg) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading your results...</p></div>;
    }
    
    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <LogoSpinner />
                <h2 className="text-2xl font-bold text-slate-800 mt-6">Finalizing Your Results</h2>
                <p className="text-slate-500 mt-2">{processingMessage}</p>
            </div>
        );
    }

    const toggleQuestion = (id: number) => {
        setExpandedQuestion(expandedQuestion === id ? null : id);
    };

    const shareText = `I passed the ${exam.name} with a score of ${result.score.toFixed(0)}%! Thanks to ${activeOrg.name} for their great exam platform.`;
    const shareTitle = `I passed the ${exam.name}!`;

    return (
        <>
        <div className="max-w-4xl mx-auto space-y-8">
            <div className={`p-8 rounded-xl text-white text-center shadow-lg ${isPassed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                {isPassed ? <CheckCircle className="mx-auto h-16 w-16" /> : <XCircle className="mx-auto h-16 w-16" />}
                <h1 className="text-4xl font-extrabold mt-4">{exam.name}</h1>
                <p className="text-2xl mt-2">{isPassed ? 'Congratulations, You Passed!' : 'Further Study Recommended'}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    
                    {isEffectivelyAdmin && (
                        <button 
                            onClick={() => history.push(`/certificate/${result.testId}`)} 
                            className="w-full text-sm flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-lg"
                        >
                            <Award size={16} /> View Certificate (Admin)
                        </button>
                    )}

                    {userCertificateVisibility === 'USER_EARNED' && (
                        <button 
                            onClick={() => history.push(`/certificate/${result.testId}`)} 
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
                        >
                            <Award size={20} /> Download Your Certificate
                        </button>
                    )}

                    {userCertificateVisibility === 'REVIEW_PENDING' && (
                        <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500 text-center">
                            <h4 className="font-bold text-amber-800">Provisional Pass</h4>
                             <p className="text-sm text-amber-700 mt-2">
                                Congratulations on passing! Your certificate will be issued following a standard integrity review within 24 hours due to proctoring flags during your session. You will be notified via email.
                            </p>
                        </div>
                    )}
                    
                    {isPassed && (
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Share2 className="mr-3 text-cyan-500" /> Share Your Achievement</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Share your success! For best results on social media, download the image below and attach it to your post.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleDownloadImage}
                                    disabled={isGeneratingShareImage}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-400"
                                >
                                    {isGeneratingShareImage ? <Spinner size="sm" /> : <Download size={16} />}
                                    {isGeneratingShareImage ? 'Generating...' : 'Download Result Image'}
                                </button>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <span className="text-sm text-slate-600">Or share a link:</span>
                                    <ShareButtons 
                                        shareUrl={window.location.origin}
                                        shareText={shareText}
                                        shareTitle={shareTitle}
                                    />
                                </div>
                            </div>
                        </div>
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
                                <div className={`mt-4 p-4 border rounded-lg max-h-96 overflow-y-auto ${aiFeedback.startsWith("We're sorry") ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                    {aiFeedback.startsWith("We're sorry") ? (
                                        <div className="flex items-start gap-3 text-amber-800">
                                            <AlertTriangle size={24} className="flex-shrink-0 mt-1"/>
                                            <p>{aiFeedback}</p>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiFeedback.replace(/\n/g, '<br />') }}></div>
                                    )}
                                </div>
                             )}
                              {aiFeedback && !aiFeedback.startsWith("We're sorry") && (
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
                                    const linkData = getGeoAffiliateLink(book);
                                    if (!linkData || !linkData.url) return null;
                                    const { url, domainName } = linkData;
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
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
            <div ref={shareableResultRef}>
                <ShareableResult
                    user={user}
                    exam={exam}
                    result={result}
                    organization={activeOrg}
                />
            </div>
        </div>
        </>
    );
};


export default Results;