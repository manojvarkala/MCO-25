import React, { FC, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const { user, token, isSubscribed, paidExamIds, isEffectivelyAdmin, isBetaTester } = useAuth();
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
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4