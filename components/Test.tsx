

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
import { ChevronLeft, ChevronRight, Send, Clock, AlertTriangle, PlayCircle, CheckCircle, HelpCircle } from 'lucide-react';

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
  const { user, isSubscribed, token, isBetaTester } = useAuth();
  const { activeOrg, isInitializing, setFeedbackRequiredForExam } = useAppContext();

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

  const allQuestionsAnswered = useMemo(() => {
    // FIX: Logic updated to be more robust. The button is enabled only when the exam has started, 
    // questions are loaded, and the number of answers is equal to the number of questions.
    return examStarted && questions.length > 0 && answers.size === questions.length;
  }, [answers.size, questions.length, examStarted]);


  const handleSubmit = useCallback(async (isAutoSubmit = false, reason = "") => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error("Could not exit fullscreen:", err));
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!user || !examId || !token || questions.length === 0 || !examConfig) {
        toast.error("Cannot submit: user or exam context is missing.");
        // FIX: Replaced `history.push` with `navigate`.
        navigate('/');
        setIsSubmitting(false);
        return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    localStorage.removeItem(`exam_timer_${examId}_${user.id}`);
    localStorage.removeItem(progressKey);

    if (isAutoSubmit && reason) {
        toast.error(`Exam submitted automatically: ${reason}`, { duration: 6000 });
    }
    
    try {
        const userAnswers: UserAnswer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({ questionId, answer }));
        const result = await googleSheetsService.submitTest(user, examId, userAnswers, questions, token, focusViolationCount);
        
        if (isBetaTester) {
            setFeedbackRequiredForExam({ examId: examConfig.id, examName: examConfig.name });
        }
        
        toast.success("Test submitted successfully!");
        // FIX: Replaced `history.push` with `navigate`.
        navigate(`/results/${result.testId}`);
    } catch (error) {
        toast.error("Failed to submit the test. Please try again.");
        setIsSubmitting(false);
        hasSubmittedRef.current = false; // Reset submit lock
    }
  }, [examId, navigate, token, user, isSubmitting, questions, answers, progressKey, focusViolationCount, isBetaTester, examConfig, setFeedbackRequiredForExam]);
  
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
                if (!isSubscribed && !isBetaTester) {
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
  }, [examId, activeOrg, isInitializing, user, isSubscribed, token, navigate, progressKey, isBetaTester]);

  // Effect 2: Manage the timer.
  useEffect(() => {
    if (!examStarted || isLoading || !examConfig || !user || !examId) return;

    // FIX: If duration is 0 or less, treat as an untimed exam and don't start the timer.
    if (!examConfig.durationMinutes || examConfig.durationMinutes <= 0) {
      setTimeLeft(null); // No timer for this exam.
      return; // Stop the effect here.
    }

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
                        <h3 className="font-bold text-amber-900 mb-2">Troubleshooting Google Sheet Errors:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li>
                                <strong>Check Sharing Settings:</strong> Ensure your Google Sheet is "Published to the web" as a CSV file. Go to File → Share → Publish to web, select "Comma-separated values (.csv)", and click Publish.
                            </li>
                            <li>
                                <strong>Verify URL:</strong> Double-check that the correct "Publish to the web" URL is pasted in the "Question Source URL" field for this exam program in your WordPress admin.
                            </li>
                            <li>
                                <strong>Clear Caches:</strong> In your WordPress admin, go to "Exam App Engine" → "Tools" and click "Clear All Question Caches".
                            </li>
                        </ol>
                    </div>
                )}
                <button onClick={() => navigate('/dashboard')} className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (!examStarted) {
        return (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-slate-800">{examConfig.name}</h1>
                <p className="text-slate-600 mt-4" dangerouslySetInnerHTML={{ __html: examConfig.description }}></p>
                <div className="grid grid-cols-3 gap-4 my-6 text-center text-slate-700 p-4 bg-slate-100 rounded-lg">
                    <div><HelpCircle className="mx-auto mb-1 text-cyan-600" /> {examConfig.numberOfQuestions} Questions</div>
                    <div><Clock className="mx-auto mb-1 text-cyan-600" /> {examConfig.durationMinutes > 0 ? `${examConfig.durationMinutes} Minutes` : 'Untimed'}</div>
                    <div><CheckCircle className="mx-auto mb-1 text-cyan-600" /> {examConfig.passScore}% to Pass</div>
                </div>

                {examConfig.isProctored && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6 text-sm text-left">
                        <p className="font-bold text-red-800">Important: This is a proctored exam.</p>
                        <ul className="list-disc pl-5 text-red-700 space-y-1 mt-2">
                            <li>You must take the exam in <strong>fullscreen mode</strong>.</li>
                            <li>You must <strong>stay on the exam tab</strong>. Navigating away will be flagged.</li>
                            <li>Multiple violations will terminate your exam.</li>
                        </ul>
                    </div>
                )}
                
                <button
                    onClick={handleStartExamFlow}
                    disabled={isStarting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition disabled:bg-slate-400"
                >
                    {isStarting ? <Spinner /> : <PlayCircle size={24} />}
                    {isStarting ? 'Starting...' : 'Start Exam'}
                </button>
            </div>
        );
    }
    
    if (countdown !== null && countdown > 0) {
        return (
            <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
                <div className="text-white text-9xl font-extrabold animate-countdown-pop" key={countdown}>
                    {countdown}
                </div>
            </div>
        );
    }
    
    if (countdown === 0) {
         return (
            <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
                <div className="text-green-400 text-9xl font-extrabold animate-countdown-pop">
                    Go!
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading Question...</p></div>;
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl max-w-5xl mx-auto">
            <header className="mb-4">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-slate-800">{examConfig.name}</h2>
                    {timeLeft !== null && (
                        <div className={`flex items-center gap-2 font-bold p-2 rounded-lg text-lg bg-slate-700 ${timerColorClass}`}>
                            <Clock size={20} />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>
                {timeLeft !== null && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${progressBarColorClass}`} style={{ width: `${timePercentage}%` }}></div>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <div className="p-6 bg-slate-50 rounded-lg min-h-[300px]">
                        <p className="text-sm text-slate-500 mb-4">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <p className="text-lg font-semibold text-slate-900 mb-6">{currentQuestion.question}</p>
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(index)}
                                    onDoubleClick={() => handleDoubleClick(index)}
                                    className={`w-full text-left p-4 border-2 rounded-lg transition-colors flex items-center ${selectedAnswer === index ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/20' : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300'}`}
                                >
                                    <span className="font-bold mr-3 text-slate-500">{String.fromCharCode(65 + index)}.</span>
                                    <span>{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <aside>
                    <div className="p-4 bg-slate-100 rounded-lg h-full">
                        <h3 className="font-bold mb-2">Navigator</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentQuestionIndex(index)}
                                    className={`w-10 h-10 rounded text-sm font-semibold transition ${
                                        index === currentQuestionIndex 
                                            ? 'bg-cyan-600 text-white ring-2 ring-offset-2 ring-cyan-600'
                                            : answers.has(questions[index].id)
                                            ? 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                                            : 'bg-white hover:bg-slate-200'
                                    }`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            <footer className="mt-6 flex flex-wrap justify-between items-center gap-4">
                <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 disabled:opacity-50"
                >
                    <ChevronLeft size={16} /> Previous
                </button>

                <button
                    onClick={() => handleSubmit(false, "")}
                    disabled={isSubmitting || !allQuestionsAnswered}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    title={allQuestionsAnswered ? "Submit your exam" : "Please answer all questions to submit"}
                >
                    {isSubmitting ? <Spinner /> : <Send size={16} />} {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                </button>

                <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 disabled:opacity-50"
                >
                    Next <ChevronRight size={16} />
                </button>
            </footer>
        </div>
    );
};

export default Test;