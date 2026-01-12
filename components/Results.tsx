
import React, { FC, useEffect, useState, useMemo, useRef, useCallback } from 'react';
// FIX: Standardized named imports from react-router-dom using single quotes.
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook } from '../types.ts';
import LogoSpinner from './LogoSpinner.tsx';
import { Award, BarChart2, CheckCircle, ChevronDown, ChevronUp, Download, Send, Sparkles, Star, XCircle, BookOpen, AlertTriangle, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
// FIX: Corrected import path for BookCover.tsx which is in the components folder.
import BookCover from './BookCover.tsx'; 
import ShareableResult from './ShareableResult.tsx';
import ShareButtons from './ShareButtons.tsx';

type UserCertVisibility = 'NONE' | 'USER_EARNED' | 'REVIEW_PENDING';

// Unified geo-affiliate link logic - NOW USES APP CONTEXT FOR IP-BASED GEO
const getGeoAffiliateLink = (book: RecommendedBook, userGeoCountryCode: string | null): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) {
        return null;
    }
    const links = book.affiliateLinks;
    
    // Map country codes to Amazon keys
    const countryToAmazonKey: Record<string, keyof RecommendedBook['affiliateLinks']> = {
        'us': 'com', // United States
        'in': 'in',  // India
        'ae': 'ae',  // United Arab Emirates
        'gb': 'com', // United Kingdom
        'ca': 'com', // Canada
        'au': 'com', // Australia
    };
    const domainNames: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.ae' };

    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    let finalDomainName: string | null = null;

    // 1. Prioritize IP-based country code if available and valid
    if (userGeoCountryCode && countryToAmazonKey[userGeoCountryCode.toLowerCase()]) {
        const preferredKey = countryToAmazonKey[userGeoCountryCode.toLowerCase()];
        if (links[preferredKey] && links[preferredKey].trim() !== '') {
            finalKey = preferredKey;
            finalDomainName = domainNames[preferredKey] || `Amazon.${preferredKey}`;
        }
    }

    // 2. Fallback to timezone-based inference if IP-based didn't yield a valid link
    if (!finalKey) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let preferredKeyFromTimezone: keyof RecommendedBook['affiliateLinks'] = 'com';
        
        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            preferredKeyFromTimezone = 'in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            preferredKeyFromTimezone = 'ae';
        }

        if (links[preferredKeyFromTimezone] && links[preferredKeyFromTimezone].trim() !== '') {
            finalKey = preferredKeyFromTimezone;
            finalDomainName = domainNames[preferredKeyFromTimezone] || `Amazon.${preferredKeyFromTimezone}`;
        }
    }

    // 3. Final fallback: Use a default priority order if no specific match yet
    if (!finalKey) {
        const fallbackPriority: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
        for (const key of fallbackPriority) {
            if (links[key] && links[key].trim() !== '') {
                finalKey = key;
                finalDomainName = domainNames[key] || `Amazon.${key}`;
                break;
            }
        }
    }

    if (finalKey && finalDomainName) {
        try {
            document.cookie = `mco_preferred_geo_key=${finalKey}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = `mco_user_geo_country_code=${userGeoCountryCode || 'UNKNOWN'}; path=/; max-age=3600; SameSite=Lax`;
        } catch(e) {
            console.error("Failed to set geo preference in cookie", e);
        }
        return { url: links[finalKey], domainName: finalDomainName, key: finalKey };
    }

    return null;
};

const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const textarea = document.createElement('div');
        textarea.innerHTML = html;
        return textarea.textContent || textarea.innerText || '';
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return html;
    }
};

const Results: FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { user, token, isSubscribed, paidExamIds, isEffectivelyAdmin, isBetaTester } = useAuth();
    const { activeOrg, suggestedBooks, userGeoCountryCode } = useAppContext();

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
                const examConfig = activeOrg.exams.find(e => e && e.id === testResult.examId);
                setExam(examConfig || null);
            } else {
                toast.error("Test result not found.");
                navigate('/dashboard');
            }
            setIsLoading(false);
        }
    }, [testId, user, activeOrg, navigate]);
    
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
            }, 4500);

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
        if (isSubscribed || isBetaTester) return true;
        return paidExamIds.includes(exam.productSku);
    }, [exam, result, isPassed, isSubscribed, paidExamIds, isBetaTester]);

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
                A student just took a practice test for the "${decodeHtmlEntities(exam.name)}" exam and got the following questions wrong.
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
            doc.text(`AI Study Guide for ${decodeHtmlEntities(exam.name)}`, 14, 22);
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
            doc.save(`AI-Study-Guide-${decodeHtmlEntities(exam.name).replace(/\s+/g, '_')}.pdf`);
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
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success("Image downloaded! You can now attach it to your post.");
    };

    const reviewAlreadySubmitted = sessionStorage.getItem(reviewSubmittedKey) === 'true';

    if (isLoading || !result || !exam || !activeOrg) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading Result...</p></div>;
    }

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <LogoSpinner />
                <p className="mt-4 text-lg font-semibold text-slate-700">{processingMessage}</p>
                <div className="w-64 bg-slate-200 rounded-full h-2 mt-4">
                    <div className="bg-cyan-500 h-2 rounded-full animate-progress"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Hidden component for screenshotting */}
            <div className="fixed -left-[9999px] top-0">
                <div ref={shareableResultRef}>
                    <ShareableResult user={user} exam={exam} result={result} organization={activeOrg} />
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg text-center border border-slate-200">
                {isPassed ? (
                    <div className="mb-6">
                        <CheckCircle className="mx-auto h-20 w-20 text-green-500 mb-4" />
                        <h1 className="text-4xl font-bold text-slate-800">Congratulations!</h1>
                        <p className="text-xl text-slate-600 mt-2">You passed the {decodeHtmlEntities(exam.name)}.</p>
                    </div>
                ) : (
                    <div className="mb-6">
                        <XCircle className="mx-auto h-20 w-20 text-red-500 mb-4" />
                        <h1 className="text-4xl font-bold text-slate-800">Keep Practicing!</h1>
                        <p className="text-xl text-slate-600 mt-2">You didn't pass the {decodeHtmlEntities(exam.name)} this time.</p>
                    </div>
                )}

                <div className="flex justify-center items-center gap-8 mt-8 mb-8">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold">Your Score</p>
                        <p className={`text-5xl font-extrabold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {result.score.toFixed(0)}%
                        </p>
                    </div>
                    <div className="h-12 w-px bg-slate-200"></div>
                    <div className="text-center">
                        <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold">Required</p>
                        <p className="text-5xl font-bold text-slate-700">{exam.passScore}%</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <p className="text-sm text-green-800">Correct Answers</p>
                        <p className="text-2xl font-bold text-green-700">{result.correctCount}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <p className="text-sm text-red-800">Incorrect Answers</p>
                        <p className="text-2xl font-bold text-red-700">{result.totalQuestions - result.correctCount}</p>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
                    ) : (
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
                    >
                        Back to Dashboard
                    </button>
                    
                    {userCertificateVisibility === 'USER_EARNED' && (
                        <button
                            onClick={() => navigate(`/certificate/${result.testId}`)}
                            className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition shadow-md"
                        >
                            <Award size={20} /> Download Certificate
                        </button>
                    )}
                    
                    {userCertificateVisibility === 'REVIEW_PENDING' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200 max-w-md text-left text-sm">
                            <AlertTriangle className="flex-shrink-0" />
                            <div>
                                <span className="font-bold">Provisional Pass:</span> Your exam was flagged for review. Your certificate will be released pending admin approval (usually within 24 hours).
                            </div>
                        </div>
                    )}

                    {isPassed && (
                        <button
                            onClick={handleDownloadImage}
                            disabled={isGeneratingShareImage}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md disabled:bg-indigo-400"
                        >
                            <Share2 size={20} /> Share Achievement
                        </button>
                    )}
                </div>
            </div>

            {/* AI Feedback Section */}
            {!isPassed && canGetAIFeedback && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-full text-white">
                            <Sparkles size={24} />
                        </div>
                        <div className="flex-grow">
                            <h2 className="text-2xl font-bold text-slate-800">AI Study Guide</h2>
                            <p className="text-slate-600 mt-1">Get personalized feedback on your incorrect answers to help you improve.</p>
                            
                            {!aiFeedback ? (
                                <button
                                    onClick={generateAIFeedback}
                                    disabled={isAiLoading}
                                    className="mt-4 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition disabled:bg-slate-300"
                                >
                                    {isAiLoading ? <LogoSpinner /> : <Sparkles size={18} />}
                                    {isAiLoading ? 'Analyzing Results...' : 'Generate My Study Guide'}
                                </button>
                            ) : (
                                <div className="mt-6">
                                    <div className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-lg border border-slate-200 mb-4">
                                        <div dangerouslySetInnerHTML={{ __html: aiFeedback.replace(/\n/g, '<br/>') }} />
                                    </div>
                                    <button
                                        onClick={downloadAiFeedback}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition"
                                    >
                                        <Download size={18} /> Download as PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!isPassed && !canGetAIFeedback && (
                <div className="bg-gradient-to-r from-slate-100 to-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Unlock AI-Powered Insights</h3>
                        <p className="text-slate-600 text-sm">Subscribe or purchase this exam to get a personalized AI breakdown of your mistakes.</p>
                    </div>
                    <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition shadow-sm whitespace-nowrap">
                        View Plans
                    </button>
                </div>
            )}

            {/* Recommended Books Section */}
            {recommendedBooksForExam.length > 0 && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><BookOpen className="mr-3 text-cyan-500" /> Recommended Study Material</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {recommendedBooksForExam.map(book => {
                            const linkData = getGeoAffiliateLink(book as RecommendedBook, userGeoCountryCode);
                            if (!linkData) return null;
                            return (
                                <div key={book.id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 w-full flex-shrink-0 flex flex-col transform hover:-translate-y-1 transition-transform duration-200">
                                    <BookCover book={book} className="w-full h-40"/>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h4 className="font-bold text-slate-800 text-sm mb-2 leading-tight flex-grow">{decodeHtmlEntities(book.title)}</h4>
                                        <a href={linkData.url} target="_blank" rel="noopener noreferrer" className="mt-auto w-full flex items-center justify-center text-xs text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-2 py-1.5 transition-colors">
                                            Buy on {linkData.domainName}
                                        </a>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Question Review (Practice Only) */}
            {exam.isPractice && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart2 className="text-cyan-500" /> Answer Review
                    </h2>
                    <div className="space-y-4">
                        {result.review.map((item, index) => {
                            const isCorrect = item.userAnswer === item.correctAnswer;
                            const isExpanded = expandedQuestion === index;
                            
                            return (
                                <div key={index} className={`border rounded-lg overflow-hidden transition-all ${isCorrect ? 'border-slate-200' : 'border-red-200 bg-red-50/30'}`}>
                                    <button 
                                        onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isCorrect ? <CheckCircle className="text-green-500 flex-shrink-0" size={20} /> : <XCircle className="text-red-500 flex-shrink-0" size={20} />}
                                            <span className={`font-medium ${isCorrect ? 'text-slate-700' : 'text-red-800'}`}>Question {index + 1}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="p-4 border-t border-slate-200 bg-white">
                                            <p className="font-semibold text-slate-800 mb-4">{item.question}</p>
                                            <div className="space-y-2">
                                                {item.options.map((opt, i) => {
                                                    let optionClass = "p-3 rounded border border-slate-100 text-slate-600";
                                                    if (i === item.correctAnswer) optionClass = "p-3 rounded border border-green-300 bg-green-50 text-green-800 font-semibold";
                                                    else if (i === item.userAnswer && !isCorrect) optionClass = "p-3 rounded border border-red-300 bg-red-50 text-red-800";
                                                    
                                                    return (
                                                        <div key={i} className={optionClass}>
                                                            {String.fromCharCode(65 + i)}. {opt}
                                                            {i === item.correctAnswer && <span className="ml-2 text-xs uppercase font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Correct</span>}
                                                            {i === item.userAnswer && !isCorrect && <span className="ml-2 text-xs uppercase font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full">Your Answer</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Review Section */}
            {!reviewAlreadySubmitted && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Rate This Exam</h2>
                    <p className="text-slate-600 mb-4">Your feedback helps us improve.</p>
                    <form onSubmit={handleReviewSubmit} className="max-w-md mx-auto space-y-4">
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star size={32} className={rating >= star ? "fill-yellow-400 text-yellow-400" : "text-slate-300"} />
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Optional: Leave a comment..."
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                            rows={3}
                        />
                        <button
                            type="submit"
                            disabled={isSubmittingReview || rating === 0}
                            className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition disabled:bg-slate-400"
                        >
                            {isSubmittingReview ? <LogoSpinner /> : 'Submit Review'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Results;
