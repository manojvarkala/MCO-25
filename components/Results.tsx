



import React, { FC, useState, useEffect } from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
// FIX: Imported the 'Send' icon to be used in the submit review button.
import { Check, X, FileDown, ShieldCheck, Sparkles, Download, Star, MessageSquare, Lock, BarChart, BookUp, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import BookCover from '../assets/BookCover.tsx';

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
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();
    const { user, token, paidExamIds, isSubscribed, isEffectivelyAdmin } = useAuth();
    const { activeOrg, suggestedBooks } = useAppContext();
    
    const [result, setResult] = useState<TestResult | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [aiFeedback, setAiFeedback] = useState<string>('');
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [submittedReview, setSubmittedReview] = useState<{rating: number; reviewText: string} | null>(null);
    
    const [isPurchased, setIsPurchased] = useState(false);
    const [attemptsExceeded, setAttemptsExceeded] = useState(false);
    const [hasPassedCert, setHasPassedCert] = useState(false);


    useEffect(() => {
        if (!testId || !user || !activeOrg) {
            if(!user) toast.error("Authentication session has expired.");
            else toast.error("Required data is missing.");
            navigate('/dashboard');
            return;
        }

        const existingReview = localStorage.getItem(`review_${testId}`);
        if (existingReview) {
            setSubmittedReview(JSON.parse(existingReview));
        }

        // Load cached AI feedback and summary
        const cachedFeedback = localStorage.getItem(`ai_feedback_${testId}`);
        if (cachedFeedback) {
            setAiFeedback(cachedFeedback);
        }
        const cachedSummary = localStorage.getItem(`ai_summary_${testId}`);
        if (cachedSummary) {
            setAiSummary(cachedSummary);
        }

        const fetchResultAndExam = () => {
            setIsLoading(true);
            try {
                const foundResult = googleSheetsService.getTestResult(user, testId);
                if (foundResult) {
                    setResult(foundResult);
                    const examConfig = activeOrg.exams.find(e => e.id === foundResult.examId);
                    if (examConfig) {
                        setExam(examConfig);

                        let certExamConfig: Exam | undefined;
                        if (examConfig.isPractice) {
                            const category = activeOrg.examProductCategories.find(c => c.practiceExamId === examConfig.id);
                            certExamConfig = category ? activeOrg.exams.find(e => e.id === category.certificationExamId) : undefined;
                        } else {
                            certExamConfig = examConfig;
                        }

                        if (certExamConfig) {
                            const purchased = paidExamIds.includes(certExamConfig.productSku);
                            setIsPurchased(purchased);
                            
                            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
                            const certAttempts = userResults.filter(r => r.examId === certExamConfig!.id);
                            setAttemptsExceeded(certAttempts.length >= 3);
                            setHasPassedCert(certAttempts.some(r => r.score >= certExamConfig!.passScore));
                        }

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
    }, [testId, user, activeOrg, navigate, paidExamIds]);

    const handleGenerateFeedback = async () => {
        if (!result || !exam) return;
        setIsGeneratingFeedback(true);
        const toastId = toast.loading('Generating AI feedback...');
        try {
            const incorrectAnswers = result.review.filter(r => r.userAnswer !== r.correctAnswer);
            if (incorrectAnswers.length === 0) {
                toast.success("You got all questions correct! No feedback needed.", { id: toastId });
                setAiFeedback("Congratulations on a perfect score! You've demonstrated excellent knowledge in all areas of this exam.");
                return;
            }

            const prompt = `I am a student preparing for the ${exam.name}. I answered the following questions incorrectly. Please provide personalized feedback for me. For each question, explain why the correct answer is right and what specific topic I should study to improve. Keep the tone encouraging and educational. Structure your response clearly with plain text headings for each question. DO NOT use markdown formatting (like ###, **, or *).

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
            if (testId) {
                localStorage.setItem(`ai_feedback_${testId}`, feedback);
            }
            toast.success("AI feedback generated!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to generate feedback.", { id: toastId });
        } finally {
            setIsGeneratingFeedback(false);
        }
    };
    
    const handleGenerateSummary = async () => {
        if (!result || !exam) return;
        setIsGeneratingSummary(true);
        const toastId = toast.loading('Generating AI performance summary...');
        try {
            const incorrectAnswers = result.review.filter(r => r.userAnswer !== r.correctAnswer);
            const correctAnswers = result.review.filter(r => r.userAnswer === r.correctAnswer);

            if (incorrectAnswers.length === 0) {
                toast.success("Perfect score! No summary needed.", { id: toastId });
                setAiSummary("Excellent work! You answered all questions correctly, demonstrating a strong grasp of the material.");
                setIsGeneratingSummary(false);
                return;
            }

            const prompt = `
                Act as an expert medical coding tutor. A student has just completed the "${exam.name}" exam and needs a performance summary.

                Their final score was ${result.score}%. They answered ${result.correctCount} out of ${result.totalQuestions} questions correctly.

                Here are the questions they got WRONG:
                ${incorrectAnswers.map(item => `
                - Question: ${item.question}
                    - Their incorrect answer: ${item.userAnswer > -1 ? item.options[item.userAnswer] : 'Not Answered'}
                    - The correct answer: ${item.options[item.correctAnswer]}
                `).join('\n')}

                Here are some of the questions they got RIGHT:
                ${correctAnswers.slice(0, 3).map(item => `
                - Question: ${item.question}
                    - Correct Answer: ${item.options[item.correctAnswer]}
                `).join('\n')}

                Based on this information, provide a concise, encouraging, and helpful performance summary. The summary should:
                1. Start with a brief, positive opening remark about their score and effort.
                2. Identify 1-3 key "Weak Areas" based on the topics of the incorrect questions. Be specific (e.g., "E/M Coding for Consultations", "ICD-10-CM Chapter-Specific Guidelines").
                3. Identify 1-2 "Strong Areas" based on the topics of the correct questions to provide encouragement.
                4. Give 2-3 actionable "Study Recommendations" for improvement. These should be specific tips, like "Review the CPT guidelines for modifier usage" or "Focus on the differences between inpatient and outpatient coding."
                5. End with an encouraging closing statement.

                Format the output clearly using plain text headings (e.g., "Weak Areas", "Strong Areas", "Study Recommendations"). Do not use any markdown formatting (like ###, **, or *). Do not repeat the questions back in the output.
            `;

            const summary = await googleSheetsService.getAIFeedback(prompt);
            setAiSummary(summary);
            if (testId) {
                localStorage.setItem(`ai_summary_${testId}`, summary);
            }
            toast.success("AI summary generated!", { id: toastId });

        } catch (error: any) {
            toast.error(error.message || "Failed to generate summary.", { id: toastId });
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleDownloadFeedback = async () => {
        if (!aiFeedback || !result || !exam || !user || !activeOrg) return;
        setIsDownloading(true);
        const toastId = toast.loading('Generating your Study Guide PDF...');
    
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            let pageNum = 1;
            let yPos = margin;
    
            const addWatermark = (pdfInstance: jsPDF) => {
                pdfInstance.setFontSize(8);
                pdfInstance.setTextColor(200, 200, 200);
                pdfInstance.text(
                    `${activeOrg.name} - Confidential Study Material`,
                    pageWidth / 2,
                    pageHeight - 5,
                    { align: 'center' }
                );
            };
    
            const addHeader = (pdfInstance: jsPDF, title: string) => {
                yPos = margin;
                pdfInstance.setFontSize(18);
                pdfInstance.setTextColor(30, 41, 59); // slate-800
                pdfInstance.setFont('helvetica', 'bold');
                pdfInstance.text(title, margin, yPos);
                yPos += 10;
                pdfInstance.setDrawColor(226, 232, 240); // slate-200
                pdfInstance.setLineWidth(0.5);
                pdfInstance.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10;
            };
    
            const addFooter = (pdfInstance: jsPDF, pageNumber: number) => {
                pdfInstance.setFontSize(8);
                pdfInstance.setTextColor(100, 116, 139); // slate-500
                pdfInstance.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
            };
    
            // First page
            addWatermark(pdf);
            addHeader(pdf, `AI Study Guide: ${exam.name}`);
    
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(71, 85, 105); // slate-600
    
            let textLines = pdf.splitTextToSize(
                `Generated for: ${user.name}\nExam Date: ${new Date(result.timestamp).toLocaleDateString()}\nScore: ${result.score}%\n\nThis guide focuses on the questions you answered incorrectly. Use it to target your study efforts.`,
                pageWidth - margin * 2
            );
            pdf.text(textLines, margin, yPos);
            yPos += (textLines.length * 5) + 10;
    
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.text('Personalized Feedback:', margin, yPos);
            yPos += 8;
    
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            
            const feedbackLines = pdf.splitTextToSize(aiFeedback, pageWidth - margin * 2);
    
            feedbackLines.forEach((line: string) => {
                if (yPos > pageHeight - margin) {
                    addFooter(pdf, pageNum);
                    pdf.addPage();
                    pageNum++;
                    addWatermark(pdf);
                    addHeader(pdf, `AI Study Guide: ${exam.name} (cont.)`);
                }
                pdf.text(line, margin, yPos);
                yPos += 5;
            });
    
            addFooter(pdf, pageNum);
    
            pdf.save(`AI-Study-Guide-${exam.name.replace(/\s+/g, '_')}.pdf`);
            toast.success('PDF downloaded!', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleSubmitReview = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating.");
            return;
        }
        if (!token || !exam) return;

        setIsSubmittingReview(true);
        const toastId = toast.loading("Submitting your review...");

        try {
            await googleSheetsService.submitReview(token, exam.productSku, rating, reviewText);
            const reviewData = { rating, reviewText };
            setSubmittedReview(reviewData);
            if (testId) {
                localStorage.setItem(`review_${testId}`, JSON.stringify(reviewData));
            }
            toast.success("Thank you for your review!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Failed to submit review.", { id: toastId });
        } finally {
            setIsSubmittingReview(false);
        }
    };

    
    const recommendedBook = exam?.recommendedBookId ? suggestedBooks.find(b => b.id === exam.recommendedBookId) : null;


    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading your results...</p></div>;
    }

    if (!result || !exam) {
        return <div className="text-center p-8"><p>Could not load results.</p></div>;
    }

    const isPass = result.score >= exam.passScore;
    const canGetCertificate = !exam.isPractice && isPass;
    const canRetryPractice = exam.isPractice && (!isSubscribed ? result.totalQuestions > 0 : true);
    
    let canRetryCert = false;
    if (!exam.isPractice) {
        if (isSubscribed) {
            canRetryCert = !hasPassedCert; // Subscribers can retry until they pass
        } else {
            canRetryCert = isPurchased && !hasPassedCert && !attemptsExceeded;
        }
    }
    
    const aiFeedbackUnlocked = isSubscribed || isPurchased || isEffectivelyAdmin;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className={`p-8 rounded-xl text-white text-center shadow-lg ${isPass ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                {isPass ? <ShieldCheck className="mx-auto h-16 w-16" /> : <BarChart className="mx-auto h-16 w-16" />}
                <h1 className="text-4xl font-extrabold mt-4">{isPass ? 'Congratulations! You Passed!' : 'Review Your Performance'}</h1>
                <p className="text-lg opacity-90 mt-2">{exam.name}</p>
            </div>

            {/* Score & Certificate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center border-t-4 border-cyan-500">
                    <p className="text-slate-500 font-semibold">Your Score</p>
                    <p className={`text-7xl font-bold my-2 ${isPass ? 'text-green-600' : 'text-red-600'}`}>{result.score.toFixed(0)}<span className="text-4xl text-slate-400">%</span></p>
                    <p className="text-slate-500">Passing Score: {exam.passScore}%</p>
                    <p className="text-sm text-slate-400 mt-2">({result.correctCount} of {result.totalQuestions} correct)</p>
                </div>
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-lg flex flex-col justify-center">
                    {canGetCertificate ? (
                        <>
                            <h2 className="text-xl font-bold text-slate-800">Your Certificate is Ready!</h2>
                            <p className="text-slate-600 mt-2 mb-4">You've earned an official certificate for passing this exam. Download it to share your achievement.</p>
                            <button onClick={() => navigate(`/certificate/${testId}`)} className="w-full sm:w-auto self-start flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition">
                                <FileDown size={16} /> Download Certificate
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-slate-800">Next Steps</h2>
                             <p className="text-slate-600 mt-2 mb-4">
                                {isPass && exam.isPractice ? "Great job passing the practice! You're ready for the certification exam." : 
                                !isPass && (canRetryPractice || canRetryCert) ? "Don't worry, you can try again. Use the feedback below to prepare." :
                                "Review your results and continue your learning journey."}
                            </p>
                            {(canRetryPractice || canRetryCert) && (
                                <button onClick={() => navigate(`/test/${exam.id}`)} className="w-full sm:w-auto self-start bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
                                    Retry Exam
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Recommended Book */}
            {recommendedBook && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Recommended Study Material</h2>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-shrink-0 w-full sm:w-40">
                             <BookCover book={recommendedBook} className="h-56 w-full" />
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-lg font-semibold text-slate-800">{recommendedBook.title}</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-4">{recommendedBook.description}</p>
                            <a 
                                href={getGeoAffiliateLink(recommendedBook).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-white bg-yellow-500 hover:bg-yellow-600 font-semibold rounded-md px-4 py-2 transition-colors"
                            >
                                <BookUp size={16} /> Buy on {getGeoAffiliateLink(recommendedBook).domainName}
                            </a>
                        </div>
                    </div>
                </div>
            )}


            {/* AI Feedback Section */}
             <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-amber-500"/> AI-Powered Feedback
                    </h2>
                     {!aiFeedbackUnlocked && (
                         <span className="text-sm text-amber-600 bg-amber-100 font-semibold px-3 py-1 rounded-full flex items-center gap-2">
                             <Lock size={14}/> Premium Feature
                         </span>
                     )}
                </div>
                
                {aiFeedbackUnlocked ? (
                    <>
                         <p className="text-slate-600 my-4">
                            Get a detailed breakdown of your incorrect answers, explanations for the correct ones, and a personalized study plan generated by AI.
                        </p>
                        {aiSummary && (
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                                <h3 className="font-semibold text-slate-700 mb-2">Performance Summary</h3>
                                <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{aiSummary}</pre>
                            </div>
                        )}
                        {aiFeedback && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                                <h3 className="font-semibold text-slate-700 mb-2">Detailed Question Review</h3>
                                <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">{aiFeedback}</pre>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-4">
                             {!aiSummary && (
                                <button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                    {isGeneratingSummary ? <Spinner/> : <Sparkles size={16}/>}
                                    {isGeneratingSummary ? 'Analyzing...' : 'Generate Summary'}
                                </button>
                            )}
                             {!aiFeedback && result.correctCount < result.totalQuestions && (
                                <button onClick={handleGenerateFeedback} disabled={isGeneratingFeedback} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                    {isGeneratingFeedback ? <Spinner/> : <Sparkles size={16}/>}
                                    {isGeneratingFeedback ? 'Generating...' : 'Generate Full Feedback'}
                                </button>
                            )}
                            {aiFeedback && (
                                <button onClick={handleDownloadFeedback} disabled={isDownloading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400">
                                    {isDownloading ? <Spinner/> : <Download size={16}/>}
                                    {isDownloading ? 'Downloading...' : 'Download Study Guide (PDF)'}
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-slate-50 border-l-4 border-amber-400 p-4 mt-4">
                        <p className="text-slate-700">
                            AI Feedback is a premium feature. <a href="/#/pricing" className="text-cyan-600 font-semibold hover:underline">Upgrade to a subscription</a> or purchase an exam bundle to unlock this feature and get personalized study guides.
                        </p>
                    </div>
                )}
            </div>

            {/* Answer Review Section */}
            {exam.isPractice && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Answer Review</h2>
                    <div className="space-y-6">
                        {result.review.map((item, index) => (
                            <div key={item.questionId} className="border-b border-slate-200 pb-4">
                                <p className="font-semibold text-slate-800">{index + 1}. {item.question}</p>
                                <div className="mt-2 space-y-1">
                                    {item.options.map((option, i) => {
                                        const isUserAnswer = i === item.userAnswer;
                                        const isCorrectAnswer = i === item.correctAnswer;
                                        let classes = "flex items-start p-2 rounded text-sm ";
                                        if (isCorrectAnswer) classes += "bg-green-50 text-green-800 font-semibold";
                                        else if (isUserAnswer) classes += "bg-red-50 text-red-800";
                                        else classes += "text-slate-600";
                                        
                                        return (
                                            <div key={i} className={classes}>
                                                {isCorrectAnswer ? <Check size={16} className="mr-2 mt-0.5 flex-shrink-0"/> : isUserAnswer ? <X size={16} className="mr-2 mt-0.5 flex-shrink-0"/> : <div className="w-5 mr-2 flex-shrink-0"></div>}
                                                <span>{option}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Rating and Review Section */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                 <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <MessageSquare className="text-cyan-500"/> Rate Your Experience
                 </h2>

                {submittedReview ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg text-center">
                        <p className="font-semibold">Thank you for your feedback!</p>
                        <div className="flex justify-center mt-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-6 h-6 ${star <= submittedReview.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-slate-600 mb-2">How would you rate this exam program?</p>
                            <div className="flex" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star 
                                        key={star} 
                                        className={`w-8 h-8 cursor-pointer transition-colors ${star <= (hoverRating || rating) ? 'text-yellow-400 fill-current' : 'text-slate-300'}`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                    />
                                ))}
                            </div>
                        </div>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            rows={3}
                            placeholder="Tell us more about your experience (optional)..."
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                            onClick={handleSubmitReview}
                            disabled={isSubmittingReview || rating === 0}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400"
                        >
                            {isSubmittingReview ? <Spinner /> : <Send size={16}/>}
                            {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Results;