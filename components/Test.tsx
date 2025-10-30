
import React, { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
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
  const history = useHistory();
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
        history.push('/');
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
        history.push(`/results/${result.testId}`);
    } catch (error) {
        toast.error("Failed to submit the test. Please try again.");
        setIsSubmitting(false);
        hasSubmittedRef.current = false; // Reset submit lock
    }
  }, [examId, history, token, user, isSubmitting, questions, answers, progressKey, focusViolationCount]);
  
  // Effect 1: Load questions and saved progress.
  useEffect(() => {
    if (isInitializing || !examId || !activeOrg || !user || !token) return;

    const config = activeOrg.exams.find(e => e.id === examId);
    if (!config) {
        toast.error("Could not find the specified exam.");
        history.push('/dashboard');
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
  }, [examId, activeOrg, isInitializing, user, isSubscribed, token, history, progressKey]);

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
                        <h3 className="font-bold mb-2">How to Fix This:</h3>
                        <p className="mb-2">This error means the Google Sheet with the questions is not accessible from our server. Try the following solutions in order:</p>
                        <h4 className="font-semibold mt-3 mb-1">Method 1: Share Link (Recommended)</h4>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Open your Google Sheet.</li>
                            <li>Click the <strong>Share</strong> button (top-right).</li>
                            <li>Under "General access," change from "Restricted" to <strong>"Anyone with the link"</strong>.</li>
                            <li>Ensure the role is set to <strong>"Viewer"</strong>.</li>
                            <li>Copy the URL from your browser's address bar and paste it into the "Question Source" field in WordPress.</li>
                        </ol>
                        <h4 className="font-semibold mt-4 mb-1">Method 2: Publish to the Web (More Reliable)</h4>
                        <p className="mb-2">If sharing doesn't work, publishing is a more stable option.</p>
                        <ol className="list-decimal list-inside space-y-1">
                             <li>In your Google Sheet, go to <strong>File &rarr; Share &rarr; Publish to the web</strong>.</li>
                             <li>In the dialog, select the correct sheet (e.g., "Sheet1").</li>
                             <li>Choose <strong>"Comma-separated values (.csv)"</strong> from the dropdown.</li>
                             <li>Click <strong>Publish</strong> and confirm.</li>
                             <li>Copy the generated link and paste it into the "Question Source" field in WordPress.</li>
                        </ol>
                        <p className="mt-3 text-xs">Note: After changing settings, it may take up to 15 minutes for the server to fetch the updated content due to caching.</p>
                    </div>
                )}

                <button 
                    onClick={() => history.push('/dashboard')} 
                    className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }
    
    if (!examConfig) {
        return <div className="text-center p-8">Exam configuration could not be loaded.</div>;
    }

    if (!examStarted) {
        // Pre-exam start screen with countdown overlay
        return (
            <>
                {countdown !== null && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div key={countdown} className="text-white text-9xl font-extrabold animate-countdown-pop">
                            {countdown > 0 ? countdown : 'GO!'}
                        </div>
                    </div>
                )}
                <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{examConfig.name}</h1>
                    <p className="text-slate-500 mb-6">{examConfig.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-lg mb-8">
                        <div className="bg-slate-100 p-4 rounded-lg"><p className="font-bold">{examConfig.numberOfQuestions}</p><p className="text-sm text-slate-600">Questions</p></div>
                        <div className="bg-slate-100 p-4 rounded-lg"><p className="font-bold">{examConfig.durationMinutes}</p><p className="text-sm text-slate-600">Minutes</p></div>
                    </div>
                    {examConfig.isProctored && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4 text-left">
                            <p className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={16}/> Important Rules</p>
                            <ul className="list-disc pl-5 text-red-700 space-y-1 text-sm mt-2">
                                <li>This exam must be taken in <strong>fullscreen mode</strong>.</li>
                                <li>Do not exit fullscreen or switch to another tab/application.</li>
                                <li>Violations will be tracked and may result in exam termination.</li>
                            </ul>
                        </div>
                    )}
                    <button onClick={handleStartExamFlow} disabled={isStarting || countdown !== null} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed">
                        {isStarting ? <Spinner /> : 'Start Exam'}
                    </button>
                </div>
            </>
        );
    }

    return (
        <div className="max-w-7xl mx-auto relative">
             <div className="bg-slate-800 text-white rounded-t-lg sticky top-0 z-10 shadow-md">
                <div className="p-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">{examConfig.name}</h1>
                    <div className={`flex items-center gap-2 bg-slate-900/50 px-6 py-2 rounded-full text-2xl font-bold font-mono transition-colors duration-500 ${timerColorClass}`}>
                        <Clock size={22} />
                        <span>{timeLeft !== null ? formatTime(timeLeft) : 'Loading...'}</span>
                    </div>
                </div>
                <div className="w-full bg-slate-700 h-2">
                    <div 
                        className={`h-full ${progressBarColorClass}`} 
                        style={{ 
                            width: `${timePercentage}%`,
                            transition: 'width 1s linear, background-color 0.5s ease'
                        }}
                        role="progressbar"
                        aria-valuenow={timeLeft !== null ? timeLeft : examConfig.durationMinutes * 60}
                        aria-valuemin={0}
                        aria-valuemax={examConfig.durationMinutes * 60}
                        aria-label="Time remaining"
                    ></div>
                </div>
            </div>
            <div className="bg-white p-2 sm:p-4 rounded-b-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200 h-full max-h-96 md:max-h-full overflow-y-auto">
                        <h2 className="font-bold mb-2">Questions ({answers.size}/{questions.length})</h2>
                        {examConfig.sections && examConfig.sections.length > 0 ? (
                            examConfig.sections.map(section => (
                                <div key={section.id} className="mb-4">
                                    <h3 className="font-semibold text-sm text-slate-600 mb-2 border-b border-slate-200 pb-1">{section.name} (Q{section.startQuestion}-{section.endQuestion})</h3>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {questions.slice(section.startQuestion - 1, section.endQuestion).map((q, index) => {
                                            const questionNumber = section.startQuestion + index;
                                            return (
                                                <button key={q.id} onClick={() => setCurrentQuestionIndex(questionNumber - 1)} className={`w-10 h-10 rounded-md text-sm font-semibold transition ${ (questionNumber - 1) === currentQuestionIndex ? 'bg-cyan-600 text-white ring-2 ring-offset-2 ring-cyan-500' : answers.has(q.id) ? 'bg-slate-300 text-slate-800' : 'bg-white border border-slate-300 hover:bg-slate-100' }`}>
                                                    {questionNumber}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {questions.map((q, index) => (
                                    <button key={q.id} onClick={() => setCurrentQuestionIndex(index)} className={`w-10 h-10 rounded-md text-sm font-semibold transition ${ index === currentQuestionIndex ? 'bg-cyan-600 text-white ring-2 ring-offset-2 ring-cyan-500' : answers.has(q.id) ? 'bg-slate-300 text-slate-800' : 'bg-white border border-slate-300 hover:bg-slate-100' }`}>
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        {currentQuestion ? (
                            <div className="p-4">
                                <p className="text-slate-500 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                                <h2 className="text-xl font-semibold text-slate-800 mb-6 leading-relaxed">{currentQuestion.question}</h2>
                                <div className="space-y-4">
                                    {currentQuestion.options.map((option, index) => (
                                        <label key={index} onDoubleClick={() => handleDoubleClick(index)} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${ selectedAnswer === index ? 'bg-cyan-50 border-cyan-500' : 'bg-white border-slate-200 hover:border-cyan-300' }`}>
                                            <input type="radio" name={`question-${currentQuestion.id}`} checked={selectedAnswer === index} onChange={() => handleAnswerSelect(index)} className="h-5 w-5 text-cyan-600 focus:ring-cyan-500"/>
                                            <span className="ml-4 text-slate-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : <p>No question loaded.</p>}
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
                        <ChevronLeft size={16} /> Previous
                    </button>
                    
                    {currentQuestionIndex < questions.length - 1 ? (
                         <button 
                            onClick={handleNext} 
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleSubmit()} 
                            disabled={isSubmitting || selectedAnswer === undefined} 
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Spinner /> : <Send size={16} />}
                            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
export default Test;
