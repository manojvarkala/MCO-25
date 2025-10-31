
import React, { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
// FIX: Replaced `useHistory` with `useNavigate` for react-router-dom v6.
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Question, UserAnswer, Exam, ExamProgress } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { ChevronLeft, ChevronRight, Send, Clock, AlertTriangle } from 'lucide-react';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const MAX_FOCUS_VIOLATIONS = 3;
const FOCUS_VIOLATION_TOAST_ID = 'focus-violation-toast';


const Test: FC = () => {
  const { examId } = useParams<{ examId: string }>();
  // FIX: Replaced `useHistory` with `useNavigate` for react-router-dom v6.
  const navigate = useNavigate();
  const { user, isSubscribed, token } = useAuth();
  const { activeOrg, isInitializing } = useAppContext();

  const [examConfig, setExamConfig] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Browser-based proctoring state
  const [focusViolationCount, setFocusViolationCount] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const timerIntervalRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);
  const progressKey = useMemo(() => `exam_progress_${examId}_${user?.id}`, [examId, user?.id]);


  const handleSubmit = useCallback(async (isAutoSubmit = false, reason = "") => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error("Could not exit fullscreen:", err));
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!user || !examId || !token || questions.length === 0) {
        toast.error("Cannot submit: user or exam context is missing.");
        // FIX: Replaced `history.push` with `navigate`.
        navigate('/');
        setIsSubmitting(false);
        return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    localStorage.removeItem(`exam_timer_${examId}_${user.id}`);
    localStorage.removeItem(progressKey);

    if (!isAutoSubmit) {
        const unansweredCount = questions.length - answers.size;
        if (unansweredCount > 0 && !window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
            setIsSubmitting(false);
            hasSubmittedRef.current = false; // Reset submit lock
            return;
        }
    } else if (reason) {
        toast.error(`Exam submitted automatically: ${reason}`, { duration: 6000 });
    }
    
    try {
        const userAnswers: UserAnswer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({ questionId, answer }));
        const result = await googleSheetsService.submitTest(user, examId, userAnswers, questions, token, focusViolationCount);
        toast.success("Test submitted successfully!");
        // FIX: Replaced `history.push` with `navigate`.
        navigate(`/results/${result.testId}`);
    } catch (error) {
        toast.error("Failed to submit the test. Please try again.");
        setIsSubmitting(false);
        hasSubmittedRef.current = false; // Reset submit lock
    }
  }, [examId, navigate, token, user, isSubmitting, questions, answers, progressKey, focusViolationCount]);
  
  // Effect 1: Load questions and saved progress.
  useEffect(() => {
    if (isInitializing || !examId || !activeOrg || !user || !token) return;

    const config = activeOrg.exams.find(e => e.id === examId);
    if (!config) {
        toast.error("Could not find the specified exam.");
        // FIX: Replaced `history.push` with `navigate`.
        navigate('/dashboard');
        return;
    }
    setExamConfig(config);

    const loadTest = async () => {
        try {
            const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
            if (config.isPractice) {
                if (!isSubscribed) {
                    const practiceAttempts = userResults.filter(r => r.examId === config.id).length;
                    if (practiceAttempts >= 10) throw new Error("You have used all 10 free practice attempts.");
                }
            } else {
                const certResults = userResults.filter(r => r.examId === config.id);
                if (certResults.some(r => r.score >= config.passScore)) throw new Error("You have already passed this exam.");
                if (certResults.length >= 3) throw new Error("You have used all 3 attempts for this exam.");
            }
            
            const savedProgressJSON = localStorage.getItem(progressKey);
            if (savedProgressJSON) {
                const savedProgress: ExamProgress = JSON.parse(savedProgressJSON);
                setQuestions(savedProgress.questions);
                setAnswers(new Map(savedProgress.answers.map(a => [a.questionId, a.answer])));
                setCurrentQuestionIndex(savedProgress.currentQuestionIndex);
                toast.success("Resumed your previous session.");
                setExamStarted(true); // Auto-start if progress exists
            } else {
                const fetchedQuestions = await googleSheetsService.getQuestions(config, token);
                setQuestions(fetchedQuestions);
                setAnswers(new Map());
                setCurrentQuestionIndex(0);
                setExamStarted(false); 
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to load test.';
            toast.error(errorMessage, { duration: 8000 });
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    loadTest();
  }, [examId, activeOrg, isInitializing, user, isSubscribed, token, navigate, progressKey]);

  // Effect 2: Manage the timer.
  useEffect(() => {
    if (!examStarted || isLoading || !examConfig || !user || !examId) return;

    const timerKey = `exam_timer_${examId}_${user.id}`;
    let endTime = localStorage.getItem(timerKey);
    if (!endTime) {
        endTime = (Date.now() + examConfig.durationMinutes * 60 * 1000).toString();
        localStorage.setItem(timerKey, endTime);
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((parseInt(endTime!) - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            handleSubmit(true, "Time expired.");
        }
    }, 1000);

    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [examStarted, isLoading, examConfig, user, examId, handleSubmit]);

    // Effect 3: Save progress.
    useEffect(() => {
        if (!examStarted || questions.length === 0) return;
        try {
            const progress: ExamProgress = { questions, answers: Array.from(answers.entries()).map(([questionId, answer]) => ({ questionId, answer })), currentQuestionIndex };
            localStorage.setItem(progressKey, JSON.stringify(progress));
        } catch (error) { console.error("Failed to save progress:", error); }
    }, [answers, currentQuestionIndex, questions, progressKey, examStarted]);

    // Effect 4: Handle focus and fullscreen for proctored exams.
    useEffect(() => {
        if (!examStarted || !examConfig?.isProctored) return;
        const handleVisibilityChange = () => { if (document.hidden) setFocusViolationCount(prev => prev + 1); };
        const handleFullscreenChange = () => { if (!document.fullscreenElement) setFocusViolationCount(prev => prev + 1); };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [examStarted, examConfig?.isProctored]);

    // Effect 5: Handle focus violation side-effects.
    useEffect(() => {
        if (focusViolationCount > 0 && focusViolationCount <= MAX_FOCUS_VIOLATIONS) {
            toast.error(`Focus Violation (${focusViolationCount}/${MAX_FOCUS_VIOLATIONS}): You must stay in fullscreen and on this tab.`, { id: FOCUS_VIOLATION_TOAST_ID, duration: 6000 });
        }
        if (focusViolationCount > MAX_FOCUS_VIOLATIONS) {
            handleSubmit(true, "Multiple focus violations.");
        }
    }, [focusViolationCount, handleSubmit]);

    // Effect 6: Manage the pre-exam countdown.
    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            // When countdown finishes, start the exam
            const timer = setTimeout(() => {
                setExamStarted(true);
                setCountdown(null); // Reset countdown state
            }, 800); // Brief pause on "Go!"
            return () => clearTimeout(timer);
        }
    }, [countdown]);


    const handleStartExamFlow = async () => {
        if (!examConfig || isStarting) return;
        setIsStarting(true);
        try {
            if (examConfig.isProctored) {
                await document.documentElement.requestFullscreen();
            }
            setCountdown(3);
        } catch (err) {
            toast.error("Fullscreen is required to start this exam.");
        } finally {
            setIsStarting(false);
        }
    };

    const handleAnswerSelect = (optionIndex: number) => {
        const currentQuestionId = questions[currentQuestionIndex].id;
        setAnswers(prevAnswers => new Map(prevAnswers).set(currentQuestionId, optionIndex));
    };

    const handlePrev = () => {
        setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
    };

    const handleDoubleClick = (optionIndex: number) => {
        if (isSubmitting) return;
        handleAnswerSelect(optionIndex);
        if (currentQuestionIndex < questions.length - 1) {
            setTimeout(() => {
                handleNext();
            }, 200); // 200ms delay for visual feedback
        }
    };
    
    const timePercentage = useMemo(() => {
        if (timeLeft === null || !examConfig) return 100;
        const totalDuration = examConfig.durationMinutes * 60;
        if (totalDuration <= 0) return 100;
        return (timeLeft / totalDuration) * 100;
    }, [timeLeft, examConfig]);

    const { timerColorClass, progressBarColorClass } = useMemo(() => {
        if (timePercentage < 20) {
            return { timerColorClass: 'text-red-400', progressBarColorClass: 'bg-red-600' };
        }
        if (timePercentage < 50) {
            return { timerColorClass: 'text-yellow-400', progressBarColorClass: 'bg-yellow-500' };
        }
        return { timerColorClass: 'text-white', progressBarColorClass: 'bg-cyan-400' };
    }, [timePercentage]);


    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
    
    if (isLoading || isInitializing) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading Exam...</p></div>;
    }
    
    if (error) {
        return (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <h1 className="text-2xl font-bold text-slate-800 mt-4">Error Loading Exam</h1>
                <p className="text-slate-600 mt-2 bg-red-50 p-4 rounded-md">{error}</p>
                
                {error.includes("Google Sheet") && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left text-sm text-amber-800">
                        <h3