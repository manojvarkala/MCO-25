import * as React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Check, X, FileDown, BookUp, ShieldCheck, Sparkles, Download, Star, MessageSquare, Lock } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';
import jsPDF from 'jspdf';
import { logoBase64 } from '../assets/logo.ts';

const Results: React.FC = () => {
    const { testId } = ReactRouterDOM.useParams<{ testId: string }>();
    const navigate = ReactRouterDOM.useNavigate();
    const { user, token, paidExamIds, isSubscribed } = useAuth();
    const { activeOrg } = useAppContext();
    
    const [result, setResult] = React.useState<TestResult | null>(null);
    const [exam, setExam] = React.useState<Exam | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [aiFeedback, setAiFeedback] = React.useState<string>('');
    const [isGeneratingFeedback, setIsGeneratingFeedback] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);

    const [rating, setRating] = React.useState(0);
    const [hoverRating, setHoverRating] = React.useState(0);
    const [reviewText, setReviewText] = React.useState('');
    const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
    const [submittedReview, setSubmittedReview] = React.useState<{rating: number; reviewText: string} | null>(null);
    
    const [isPurchased, setIsPurchased] = React.useState(false);
    const [attemptsExceeded, setAttemptsExceeded] = React.useState(false);
    const [hasPassedCert, setHasPassedCert] = React.useState(false);


    React.useEffect(() => {
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
    
            const addWatermarkAndFooter = (pageNumber: number) => {
                // Watermark
                pdf.setFontSize(52);
                pdf.setTextColor(230, 230, 230);
                pdf.setFont('helvetica', 'bold');
                pdf.text(activeOrg.name, pageWidth / 2, pageHeight / 2, { angle: -45, align: 'center' });
                
                // Footer
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.setFont('helvetica', 'normal');
                const footerText = `Page ${pageNumber} | © ${new Date().getFullYear()} ${activeOrg.name}`;
                pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
            };
    
            // --- Page 1: Cover Page ---
            pdf.setFillColor(240, 248, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            if (logoBase64) pdf.addImage(logoBase64, 'PNG', margin, margin, 20, 20);
            
            pdf.setFontSize(26);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.text('AI-Powered Study Guide', pageWidth / 2, 60, { align: 'center' });
    
            pdf.setFontSize(18);
            pdf.setTextColor(51, 65, 85);
            pdf.setFont('helvetica', 'normal');
            pdf.text(exam.name, pageWidth / 2, 80, { align: 'center' });
            
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, 100, pageWidth - margin, 100);
    
            pdf.setFontSize(14);
            pdf.text('Candidate:', margin, 120);
            pdf.setFont('helvetica', 'bold');
            pdf.text(user.name, margin + 30, 120);
            
            pdf.setFont('helvetica', 'normal');
            pdf.text('Date:', margin, 130);
            pdf.setFont('helvetica', 'bold');
            pdf.text(new Date().toLocaleDateString(), margin + 30, 130);
    
            // --- Content Pages ---
            pdf.addPage();
            pageNum++;
            addWatermarkAndFooter(pageNum);
            let yPos = margin;
            
            const contentWidth = pageWidth - margin * 2;
            const lines = aiFeedback.split('\n');
    
            lines.forEach(line => {
                let fontSize = 11;
                let style = 'normal';
                let leftMargin = margin;
                let isList = false;
    
                if (line.startsWith('## ')) {
                    line = line.substring(3);
                    fontSize = 16;
                    style = 'bold';
                    if (yPos > margin + 5) yPos += 5; 
                } else if (line.startsWith('* ') || line.startsWith('- ')) {
                    line = '• ' + line.substring(2);
                    leftMargin = margin + 5;
                    isList = true;
                } else if (line.trim() === '---') {
                    if(yPos > margin + 5) yPos += 2;
                    pdf.setDrawColor(220,220,220);
                    pdf.line(margin, yPos, pageWidth - margin, yPos);
                    yPos += 4;
                    return;
                } else if (line.trim() === '') {
                    yPos += 5;
                    return;
                }
    
                pdf.setFontSize(fontSize);
                pdf.setFont('helvetica', style);
                pdf.setTextColor(30, 41, 59);
                
                const effectiveWidth = contentWidth - (isList ? 5 : 0);
                const splitLines = pdf.splitTextToSize(line, effectiveWidth);
                
                if (yPos + (splitLines.length * fontSize * 0.35) > pageHeight - margin - 10) {
                    pdf.addPage();
                    pageNum++;
                    addWatermarkAndFooter(pageNum);
                    yPos = margin;
                    if (style === 'bold') yPos += 5;
                }
    
                pdf.text(splitLines, leftMargin, yPos);
                yPos += (splitLines.length * fontSize * 0.35) + (isList ? 1.5 : 3);
            });
    
            // --- Back Cover Page ---
            pdf.addPage();
            pageNum++;
            addWatermarkAndFooter(pageNum);
            yPos = margin;
            
            if (exam.recommendedBook) {
                const { url, domainName } = getGeoAffiliateLink(exam.recommendedBook);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(15, 23, 42);
                pdf.text('Recommended Study Material', margin, yPos);
                yPos += 15;
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(exam.recommendedBook.title, margin, yPos);
                yPos += 8;
    
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                const descLines = pdf.splitTextToSize(exam.recommendedBook.description, contentWidth);
                pdf.text(descLines, margin, yPos);
                yPos += (descLines.length * 11 * 0.35) + 10;
                
                pdf.setTextColor(0, 102, 204);
                pdf.textWithLink(`Click here to buy on ${domainName}`, margin, yPos, { url });
            }
            
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'normal');
            const copyrightText = `Copyright © ${new Date().getFullYear()} ${activeOrg.name}. All Rights Reserved.\nThis document is intended for the personal use of ${user.name} and may not be reproduced or distributed.`;
            const copyrightLines = pdf.splitTextToSize(copyrightText, contentWidth);
            pdf.text(copyrightLines, pageWidth / 2, pageHeight - 30, { align: 'center' });
    
            // --- Save ---
            pdf.save(`AI-Study-Guide-${exam.name.replace(/\s+/g, '_')}.pdf`);
            toast.dismiss(toastId);
            toast.success("Study Guide downloaded!");
        } catch(error) {
            toast.dismiss(toastId);
            toast.error("Could not download PDF. Please try again.");
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating.");
            return;
        }
        if (!token || !testId || !exam) {
            toast.error("Cannot submit review: missing required info.");
            return;
        }

        setIsSubmittingReview(true);
        try {
            await googleSheetsService.submitReview(token, exam.id, rating, reviewText);
            const reviewData = { rating, reviewText };
            localStorage.setItem(`review_${testId}`, JSON.stringify(reviewData));
            setSubmittedReview(reviewData);
            toast.success("Thank you for your review!");
        } catch (error: any) {
            toast.error(error.message || "Failed to submit review.");
        } finally {
            setIsSubmittingReview(false);
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
    
    if (!result || !exam || !user) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-md"><p>Could not load results.</p></div>
    }
    
    const isPass = result.score >= exam.passScore;
    const isPaidCertExam = !exam.isPractice;
    const canUseAiFeedback = isSubscribed || (isPurchased && !hasPassedCert && !attemptsExceeded);
    const scoreColor = isPass ? 'text-green-600' : 'text-red-600';
    const isAdmin = !!user?.isAdmin;

    return (
        <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Results for {exam.name}</h1>
            
            <div className={`text-center border-2 ${isPass ? 'border-green-200' : 'border-red-200'} bg-slate-50 rounded-lg p-6 mb-8`}>
                <p className="text-lg text-slate-600">Your Score</p>
                <p className={`text-7xl font-bold ${scoreColor}`}>{result.score}%</p>
                <p className="text-slate-500 mt-2">({result.correctCount} out of {result.totalQuestions} correct)</p>
                <p className={`mt-4 text-xl font-semibold ${scoreColor}`}>{isPass ? 'Congratulations, you passed!' : 'Unfortunately, you did not pass.'}</p>
            </div>

            {((isPaidCertExam && isPass) || isAdmin) && (
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
            
            <div className="text-center mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Rate Your Experience</h2>
                {submittedReview ? (
                    <div>
                        <p className="text-slate-600 mb-2">Thank you for your feedback!</p>
                        <div className="flex justify-center items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={24} className={i < submittedReview.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'} />
                            ))}
                        </div>
                        {submittedReview.reviewText && (
                            <blockquote className="mt-4 text-slate-500 italic border-l-4 border-slate-300 pl-4 text-left max-w-md mx-auto">
                                "{submittedReview.reviewText}"
                            </blockquote>
                        )}
                    </div>
                ) : (
                    <div className="max-w-md mx-auto">
                        <div className="flex justify-center items-center gap-2 mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={32}
                                    className={`cursor-pointer transition-colors ${(hoverRating || rating) > i ? 'text-yellow-400 fill-current' : 'text-slate-300'}`}
                                    onMouseEnter={() => setHoverRating(i + 1)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(i + 1)}
                                />
                            ))}
                        </div>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your thoughts (optional)"
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                            rows={3}
                        />
                        <button
                            onClick={handleSubmitReview}
                            disabled={isSubmittingReview}
                            className="mt-4 inline-flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-cyan-300"
                        >
                            {isSubmittingReview ? <Spinner /> : <MessageSquare size={16} />}
                            <span>{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</span>
                        </button>
                    </div>
                )}
            </div>

            {!isPass && (
                <div className="text-center mb-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <h2 className="text-xl font-semibold text-amber-800 mb-4">Need some help?</h2>
                    {canUseAiFeedback ? (
                        <>
                            <p className="text-amber-700 max-w-2xl mx-auto mt-2 mb-4">Don't worry, practice makes perfect. Use our AI-powered tool to get a personalized study plan based on the questions you missed.</p>
                            <button
                                onClick={handleGenerateFeedback}
                                disabled={isGeneratingFeedback}
                                title="Didn't pass? Let our AI create a custom study guide for you. It analyzes the questions you missed and explains the key topics to focus on for your next attempt."
                                className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-amber-300"
                            >
                                {isGeneratingFeedback ? <Spinner /> : <Sparkles size={20} />}
                                <span>{isGeneratingFeedback ? 'Generating...' : 'Get AI-Powered Feedback'}</span>
                            </button>
                        </>
                    ) : (
                        <>
                             <p className="text-amber-700 max-w-2xl mx-auto mt-2 mb-4">Unlock our AI-powered study guide to get personalized feedback. This premium feature is available to subscribers or with an exam purchase.</p>
                             <button
                                 disabled
                                 title="This is a premium feature. Subscribe or purchase the certification exam to unlock the AI study guide. Access is removed for a specific exam after you pass it or use all 3 attempts."
                                 className="inline-flex items-center space-x-2 bg-slate-400 text-white font-bold py-3 px-6 rounded-lg cursor-not-allowed"
                             >
                                <Lock size={20} />
                                <span>AI Feedback Locked</span>
                            </button>
                            <a href="#/pricing" className="mt-3 inline-block text-sm text-cyan-600 hover:underline">
                                View Purchase & Subscription Options
                            </a>
                        </>
                    )}
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
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-slate-700 flex items-center gap-2"><Sparkles className="text-cyan-500" /> AI Study Guide</h2>
                        <button
                            onClick={handleDownloadFeedback}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {isDownloading ? <Spinner /> : <Download size={16} />}
                            <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
                        </button>
                    </div>
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap">{aiFeedback}</div>
                </div>
            )}
            
            {isPaidCertExam && !isPass && (
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
                                    As an Amazon Associate, we earn from qualifying purchases. Using our links doesn't cost you anything extra and helps support our platform!
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })()} 
            
            {!isPaidCertExam && (
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
        </div>
    );
};

export default Results;