





import React, { FC, useState, useEffect } from 'react';
// FIX: Corrected import statement for react-router-dom to resolve module export errors.
import { useParams, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { TestResult, Exam, RecommendedBook } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Check, X, FileDown, BookUp, ShieldCheck, Sparkles, Download, Star, MessageSquare, Lock, BarChart } from 'lucide-react';
import BookCover from '../assets/BookCover.tsx';
import jsPDF from 'jspdf';

const Results: FC = () => {
    const { testId } = useParams<{ testId: string }>();
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();
    const { user, token, paidExamIds, isSubscribed } = useAuth();
    const { activeOrg } = useAppContext();
    
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
            if (activeOrg && activeOrg.logo) pdf.addImage(activeOrg.logo, 'PNG', margin, margin, 20, 20);
            
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
            yPos = margin;
            
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
                pdf.setTextColor(15, 23, 42); // slate-900
                pdf.text('Recommended Study Material', margin, yPos);
                yPos += 15;
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(exam.recommendedBook.title, margin, yPos);
                yPos += 8;
    
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(51, 65, 85); // slate-700
                const descLines = pdf.splitTextToSize(exam.recommendedBook.description, contentWidth);
                pdf.text(descLines, margin, yPos);
                yPos += (descLines.length * 11 * 0.35) + 10;
                
                const linkText = `Click here to buy on ${domainName}`;
                const fontSize = 11;
                pdf.setFontSize(fontSize);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(0, 102, 204); // A standard blue link color

                // 1. Calculate dimensions in current document units (mm)
                const fontSizeInUnits = fontSize / pdf.internal.scaleFactor;
                const textWidth = pdf.getStringUnitWidth(linkText) * fontSizeInUnits;
                
                // 2. Render the text
                pdf.text(linkText, margin, yPos);

                // 3. Draw an underline
                pdf.setDrawColor(0, 102, 204); // blue underline
                pdf.setLineWidth(0.2); // Set a thin line width
                pdf.line(margin, yPos + 0.5, margin + textWidth, yPos + 0.5); // Draw line just below the text baseline

                // 4. Create the clickable link area
                pdf.link(margin, yPos - fontSizeInUnits, textWidth, fontSizeInUnits, { url: url });
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
        let preferredKey: keyof RecommendedBook['affiliateLinks'] = 'com';
        let preferredDomain = 'Amazon.com';
    
        // Determine preferred locale
        const gccTimezones = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat'];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            preferredKey = 'in';
            preferredDomain = 'Amazon.in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            preferredKey = 'ae';
            preferredDomain = 'Amazon.ae';
        }
    
        // Check if the preferred URL exists and is valid
        const preferredUrl = book.affiliateLinks[preferredKey];
        if (preferredUrl && preferredUrl.trim() !== '') {
            return { url: preferredUrl, domainName: preferredDomain };
        }
    
        // Fallback to .com if preferred is not available or is an empty string
        if (book.affiliateLinks.com && book.affiliateLinks.com.trim() !== '') {
            return { url: book.affiliateLinks.com, domainName: 'Amazon.com' };
        }
        
        // If both preferred and .com are invalid, return the original .com link (which is likely empty)
        return { url: book.affiliateLinks.com || '', domainName: 'Amazon.com' };
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
                        <div className="text-center text-green-700 bg-green-50 p-4 rounded-md">
                            <p>Thank you for your review!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className={`w-8 h-8 cursor-pointer transition-colors ${ (hoverRating || rating) >= star ? 'text-yellow-400 fill-current' : 'text-slate-300' }`}
                                    />
                                ))}
                            </div>
                            <textarea 
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="Tell us more about your experience (optional)..."
                                className="w-full p-2 border border-slate-300 rounded-md"
                                rows={3}
                            />
                            <button 
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview}
                                className="inline-flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-slate-400"
                            >
                                {isSubmittingReview ? <Spinner /> : <span>Submit Review</span>}
                            </button>
                        </div>
                    )}
                </div>


                {exam.recommendedBook && (() => {
                    const { url, domainName } = getGeoAffiliateLink(exam.recommendedBook);
                    if (!url) return null; // Don't render if no valid URL was found
                    return (
                         <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">Recommended Study Material</h2>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="flex-shrink-0 w-32 h-40">
                                    <BookCover book={exam.recommendedBook} className="w-full h-full rounded-md shadow-lg" />
                                </div>
                                <div className="flex-grow">
                                    <h3 className="text-lg font-bold text-slate-800">{exam.recommendedBook.title}</h3>
                                    <p className="text-sm text-slate-600 mt-2 mb-4">{exam.recommendedBook.description}</p>
                                    <a 
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                                    >
                                        <BookUp size={16}/> 
                                        <span>Buy on {domainName}</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div className="mt-8 bg-white p-8 rounded-xl shadow-lg">
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-lg mb-8">
                     <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Sparkles className="h-10 w-10 text-yellow-300" />
                            <div>
                                <h2 className="text-2xl font-bold">AI-Powered Feedback</h2>
                                <p className="text-purple-200">Unlock your personalized study guide.</p>
                            </div>
                        </div>
                        {canUseAiFeedback ? (
                             <div className="flex gap-2">
                                <button 
                                    onClick={handleGenerateSummary}
                                    disabled={isGeneratingSummary || !!aiSummary}
                                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                                >
                                    {isGeneratingSummary ? <Spinner /> : <BarChart size={16}/>}
                                    <span>{aiSummary ? 'Summary Generated' : 'Performance Summary'}</span>
                                </button>
                                <button 
                                    onClick={handleGenerateFeedback}
                                    disabled={isGeneratingFeedback || !!aiFeedback}
                                    className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                                >
                                    {isGeneratingFeedback ? <Spinner /> : <ShieldCheck size={16}/>}
                                    <span>{aiFeedback ? 'Feedback Generated' : 'Detailed Feedback'}</span>
                                </button>
                             </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-md text-sm">
                                <Lock size={16} />
                                <span>{isSubscribed ? 'AI enabled for subscribers' : 'Available for subscribers or on purchased exams'}</span>
                            </div>
                        )}
                     </div>
                </div>

                {aiSummary && (
                    <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                        <h3 className="text-xl font-semibold text-slate-800 mb-4">AI Performance Summary</h3>
                        <div className="prose prose-slate max-w-none whitespace-pre-wrap">{aiSummary}</div>
                    </div>
                )}
                
                {aiFeedback && (
                    <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-slate-800">AI Detailed Feedback</h3>
                            <button 
                                onClick={handleDownloadFeedback}
                                disabled={isDownloading}
                                className="inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-green-300"
                            >
                                {isDownloading ? <Spinner/> : <Download size={16}/>}
                                <span>Download as PDF</span>
                            </button>
                        </div>
                        <div className="prose prose-slate max-w-none whitespace-pre-wrap">{aiFeedback}</div>
                    </div>
                )}

                {exam.isPractice && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Answer Review</h2>
                        <div className="space-y-6">
                            {result.review.map((item) => (
                                <div key={item.questionId} className={`p-4 rounded-lg border-2 ${item.userAnswer === item.correctAnswer ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                    <p className="font-semibold text-slate-800 mb-3">{item.question}</p>
                                    <div className="space-y-2 text-sm">
                                        {item.options.map((option, index) => {
                                            const isCorrect = index === item.correctAnswer;
                                            const isUserAnswer = index === item.userAnswer;
                                            let indicator = <span className="w-5 h-5"></span>; // Placeholder
                                            if (isCorrect) indicator = <Check className="w-5 h-5 text-green-600" />;
                                            if (isUserAnswer && !isCorrect) indicator = <X className="w-5 h-5 text-red-600" />;

                                            return (
                                                <div key={index} className={`flex items-start p-2 rounded ${isCorrect ? 'bg-green-100' : ''} ${isUserAnswer && !isCorrect ? 'bg-red-100' : ''}`}>
                                                    <div className="flex-shrink-0 mr-2">{indicator}</div>
                                                    <p className="flex-grow">{option}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {item.userAnswer === -1 && <p className="text-sm text-slate-500 mt-2">You did not answer this question.</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Results;