
import React, { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
// FIX: Standardized named imports from react-router-dom using single quotes.
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

    if (!user || !examId || !token || questions.length === 0 || !examConfig) {
        toast.error("Cannot submit: context missing.");
        navigate('/');
        return;
    }

    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    localStorage.removeItem(`exam_timer_${examId}_${user.id}`);
    localStorage.removeItem(progressKey);

    if (isAutoSubmit && reason) {
        toast.error(`Exam submitted: ${reason}`, { duration: 6000 });
    }
    
    try {
        const userAnswers: UserAnswer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({ questionId, answer }));
        const result = await googleSheetsService.submitTest(user, examId, userAnswers, questions, token, focusViolationCount);
        
        if (isBetaTester) {
            setFeedbackRequiredForExam({ examId: examConfig.id, examName: examConfig.name });
        }
        
        toast.success("Test submitted successfully!");
        navigate(`/results/${result.testId}`);
    } catch (error) {
        toast.error("Failed to submit. Please try again.");
        setIsSubmitting(false);
        hasSubmittedRef.current = false;
    }
  }, [examId, navigate, token, user, isSubmitting, questions, answers, progressKey, focusViolationCount, isBetaTester, examConfig, setFeedbackRequiredForExam]);

  useEffect(() => {
    if (isInitializing || !activeOrg || !examId || !user) return;

    const config = activeOrg.exams.find(e => e.id === examId);
    if (!config) {
      setError("Exam configuration not found.");
      setIsLoading(false);
      return;
    }
    setExamConfig(config);

    const loadData = async () => {
      try {
        const fetchedQuestions = await googleSheetsService.getQuestions(config, token || '');
        if (fetchedQuestions.length === 0) throw new Error("No questions found in data source.");
        setQuestions(fetchedQuestions);

        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          const parsedProgress: ExamProgress = JSON.parse(savedProgress);
          setAnswers(new Map(parsedProgress.answers.map(ua => [ua.questionId, ua.answer])));
          setCurrentQuestionIndex(parsedProgress.currentQuestionIndex);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load exam questions.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [examId, activeOrg, isInitializing, user, token, progressKey]);

  useEffect(() => {
    if (examStarted && !hasSubmittedRef.current && timeLeft !== null && timeLeft > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) {
            window.clearInterval(timerIntervalRef.current!);
            handleSubmit(true, "Time expired");
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => { if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current); };
  }, [examStarted, timeLeft, handleSubmit]);

  useEffect(() => {
    if (!examStarted || !examConfig?.isProctored) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmittedRef.current) {
        setFocusViolationCount(prev => {
          const next = prev + 1;
          toast.error(`Violation ${next}/${MAX_FOCUS_VIOLATIONS}: Do not leave the exam tab!`, { id: FOCUS_VIOLATION_TOAST_ID, duration: 5000 });
          if (next >= MAX_FOCUS_VIOLATIONS) handleSubmit(true, "Excessive proctoring violations");
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [examStarted, examConfig, handleSubmit]);

  const startExam = async () => {
    if (isStarting) return;
    setIsStarting(true);
    
    if (examConfig?.isProctored) {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            toast.error("Fullscreen is required for this proctored exam.");
            setIsStarting(false);
            return;
        }
    }

    setCountdown(3);
    const interval = window.setInterval(() => {
        setCountdown(prev => {
            if (prev === 1) {
                window.clearInterval(interval);
                setExamStarted(true);
                setIsStarting(false);
                const duration = examConfig?.durationMinutes ? examConfig.durationMinutes * 60 : 3600;
                setTimeLeft(duration);
                return null;
            }
            return prev ? prev - 1 : null;
        });
    }, 1000);
  };

  const handleAnswer = (answerIndex: number) => {
    if (!questions[currentQuestionIndex]) return;
    const newAnswers = new Map(answers);
    newAnswers.set(questions[currentQuestionIndex].id, answerIndex);
    setAnswers(newAnswers);

    const progress: ExamProgress = {
      questions,
      answers: Array.from(newAnswers.entries()).map(([questionId, answer]) => ({ questionId, answer })),
      currentQuestionIndex
    };
    localStorage.setItem(progressKey, JSON.stringify(progress));
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[60vh]"><LogoSpinner /><p className="mt-4 text-slate-500">Preparing Exam...</p></div>;
  if (error) return <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg text-center"><AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" /><h2 className="text-2xl font-bold mb-2">Error</h2><p className="text-slate-600">{error}</p><button onClick={() => navigate('/dashboard')} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg">Return to Dashboard</button></div>;

  if (!examStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{examConfig?.name}</h1>
        <div className="space-y-6 text-slate-600">
          <p className="text-lg">You are about to start the <strong>{examConfig?.name}</strong>. Please ensure you have a stable internet connection.</p>
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
            <div className="flex items-center gap-2"><Clock className="text-cyan-500" /> <span>{examConfig?.durationMinutes} Minutes</span></div>
            <div className="flex items-center gap-2"><HelpCircle className="text-cyan-500" /> <span>{questions.length} Questions</span></div>
          </div>
          {examConfig?.isProctored && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle size={18}/> Proctoring Active</h3>
              <ul className="text-sm list-disc pl-5 text-amber-700 space-y-1">
                <li>Exam must be taken in Fullscreen.</li>
                <li>Do not leave this tab or minimize the browser.</li>
                <li>Violations are logged and will result in automatic submission.</li>
              </ul>
            </div>
          )}
        </div>
        <button onClick={startExam} disabled={isStarting} className="w-full mt-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xl rounded-xl transition shadow-lg flex items-center justify-center gap-3">
          {isStarting ? <Spinner /> : <><PlayCircle /> {countdown ? `Starting in ${countdown}...` : 'Start Exam'}</>}
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Timer & Header */}
      <div className="sticky top-0 z-40 bg-[rgb(var(--color-background-rgb))] py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-mono text-xl shadow-inner border border-slate-700">
            <Clock size={20} className="text-cyan-400" />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Progress</p>
            <p className="text-lg font-bold">{currentQuestionIndex + 1} <span className="text-slate-400 font-medium">/ {questions.length}</span></p>
          </div>
        </div>
        <button onClick={() => handleSubmit()} disabled={isSubmitting} className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition shadow-md flex items-center gap-2">
          {isSubmitting ? <Spinner /> : <><Send size={18}/> Submit Exam</>}
        </button>
        <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden shadow-inner">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
        {/* Navigation Grid */}
        <div className="hidden lg:block space-y-4">
          <h3 className="font-bold text-sm text-slate-500 uppercase">Question Navigator</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestionIndex(i)}
                className={`h-10 w-10 rounded-md font-bold text-sm transition ${
                  currentQuestionIndex === i ? 'bg-cyan-600 text-white shadow-lg scale-110' :
                  answers.has(questions[i].id) ? 'bg-green-100 text-green-700 border border-green-200' :
                  'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Question Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 min-h-[400px] flex flex-col">
            <span className="inline-block px-3 py-1 bg-cyan-50 text-cyan-700 text-xs font-bold rounded-full mb-4">QUESTION {currentQuestionIndex + 1}</span>
            <h2 className="text-2xl font-bold text-slate-800 mb-8 leading-snug">{currentQuestion?.question}</h2>
            <div className="space-y-4 flex-grow">
              {currentQuestion?.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group ${
                    answers.get(currentQuestion.id) === i
                      ? 'border-cyan-500 bg-cyan-50 shadow-md translate-x-2'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                    answers.get(currentQuestion.id) === i ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={`text-lg font-medium ${answers.get(currentQuestion.id) === i ? 'text-cyan-900' : 'text-slate-700'}`}>{option}</span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-100">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition"
              >
                <ChevronLeft /> Previous
              </button>
              <button
                disabled={currentQuestionIndex === questions.length - 1}
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="flex items-center gap-2 px-8 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 disabled:opacity-30 transition shadow-lg"
              >
                Next Question <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;
