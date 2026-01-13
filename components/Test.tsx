import React, { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Question, UserAnswer, Exam, ExamProgress } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { ChevronLeft, ChevronRight, Send, Clock, AlertTriangle, PlayCircle, HelpCircle, ShieldAlert } from 'lucide-react';

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
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  
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
        toast.error("Cannot submit: session or context expired.");
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
        toast.error("Cloud sync failed. Result saved locally.");
        setIsSubmitting(false);
        hasSubmittedRef.current = false;
    }
  }, [examId, navigate, token, user, isSubmitting, questions, answers, progressKey, focusViolationCount, isBetaTester, examConfig, setFeedbackRequiredForExam]);

  useEffect(() => {
    if (isInitializing || !activeOrg || !examId || !user) return;

    const config = activeOrg.exams.find(e => e.id === examId);
    if (!config) {
      setError({title: "Exam Not Found", message: "The requested exam configuration is missing from the platform database."});
      setIsLoading(false);
      return;
    }
    setExamConfig(config);

    const loadData = async () => {
      try {
        const fetchedQuestions = await googleSheetsService.getQuestions(config, token || '');
        if (fetchedQuestions.length === 0) throw new Error("Question dataset empty.");
        setQuestions(fetchedQuestions);

        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          const parsedProgress: ExamProgress = JSON.parse(savedProgress);
          setAnswers(new Map(parsedProgress.answers.map(ua => [ua.questionId, ua.answer])));
          setCurrentQuestionIndex(parsedProgress.currentQuestionIndex);
        }
      } catch (err: any) {
        const isRestricted = err.message.toLowerCase().includes('restricted') || err.message.toLowerCase().includes('private');
        setError({
            title: isRestricted ? "Access Restricted" : "Dataset Error",
            message: isRestricted ? "The Google Sheet for this exam is private. Admin must 'Publish to Web' as CSV." : (err.message || "Failed to parse questions.")
        });
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
          toast.error(`Violation ${next}/${MAX_FOCUS_VIOLATIONS}: Switch back to exam tab!`, { id: FOCUS_VIOLATION_TOAST_ID, duration: 5000 });
          if (next >= MAX_FOCUS_VIOLATIONS) handleSubmit(true, "Proctoring integrity breach");
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
            toast.error("Proctored exams require full-screen mode.");
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

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[60vh]"><LogoSpinner /><p className="mt-4 text-slate-500 font-mono text-xs uppercase tracking-widest">Compiling Question Dataset...</p></div>;
  
  if (error) return (
      <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-2xl shadow-xl text-center border-t-4 border-red-500">
          <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">{error.title}</h2>
          <p className="text-slate-600 leading-relaxed">{error.message}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-8 px-8 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition">Return to Control Panel</button>
      </div>
  );

  if (!examStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
        <h1 className="text-3xl font-black text-slate-900 mb-4">{examConfig?.name}</h1>
        <div className="space-y-6 text-slate-600">
          <p className="text-lg">Preparing session for <strong>{examConfig?.name}</strong>. Data retrieved successfully.</p>
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
            <div className="flex items-center gap-2 font-bold"><Clock className="text-cyan-500" /> <span>{examConfig?.durationMinutes} Minutes</span></div>
            <div className="flex items-center gap-2 font-bold"><HelpCircle className="text-cyan-500" /> <span>{questions.length} Questions</span></div>
          </div>
          {examConfig?.isProctored && (
            <div className="p-5 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-black text-amber-800 flex items-center gap-2 mb-3 uppercase text-xs tracking-widest"><ShieldAlert size={18}/> Proctoring Requirements</h3>
              <ul className="text-sm list-disc pl-5 text-amber-700 space-y-2">
                <li>System will force <strong>Fullscreen Mode</strong>.</li>
                <li>Navigating away will flag your attempt for integrity review.</li>
                <li>Three violations will terminate the session immediately.</li>
              </ul>
            </div>
          )}
        </div>
        <button onClick={startExam} disabled={isStarting} className="w-full mt-8 py-5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xl rounded-2xl transition shadow-lg flex items-center justify-center gap-3">
          {isStarting ? <Spinner /> : <><PlayCircle /> {countdown ? `ENGAGING IN ${countdown}...` : 'START EXAMINATION'}</>}
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="sticky top-0 z-40 bg-[rgb(var(--color-background-rgb))] py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-mono text-2xl shadow-inner border border-slate-700">
            <Clock size={20} className="text-cyan-400" />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Progression</p>
            <p className="text-xl font-black">{currentQuestionIndex + 1} <span className="text-slate-400 font-medium text-sm">/ {questions.length}</span></p>
          </div>
        </div>
        <button onClick={() => handleSubmit()} disabled={isSubmitting} className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition shadow-lg flex items-center gap-2 uppercase tracking-wider text-sm">
          {isSubmitting ? <Spinner /> : <><Send size={18}/> Finalize Submission</>}
        </button>
        <div className="w-full h-3 bg-slate-800 rounded-full mt-2 overflow-hidden shadow-inner border border-slate-700">
          <div className="h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-10">
        <div className="hidden lg:block space-y-4">
            <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Matrix Navigator</h3>
            <div className="grid grid-cols-5 gap-2">
                {questions.map((_, i) => (
                <button
                    key={i}
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={`h-11 w-11 rounded-lg font-black text-sm transition-all ${
                    currentQuestionIndex === i ? 'bg-cyan-600 text-white shadow-xl scale-110 ring-2 ring-cyan-400' :
                    answers.has(questions[i].id) ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                    'bg-slate-800 text-slate-500 border border-slate-700 hover:border-cyan-500 hover:text-cyan-400'
                    }`}
                >
                    {i + 1}
                </button>
                ))}
            </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 min-h-[450px] flex flex-col">
            <span className="inline-block px-3 py-1 bg-cyan-100 text-cyan-800 text-[10px] font-black rounded-lg mb-6 uppercase tracking-widest">Point Cluster {currentQuestionIndex + 1}</span>
            <h2 className="text-3xl font-bold text-slate-900 mb-10 leading-tight">{currentQuestion?.question}</h2>
            <div className="space-y-4 flex-grow">
              {currentQuestion?.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 flex items-start gap-5 group ${
                    answers.get(currentQuestion.id) === i
                      ? 'border-cyan-500 bg-cyan-50 shadow-xl translate-x-2'
                      : 'border-slate-100 hover:border-cyan-200 hover:bg-slate-50 hover:shadow-md'
                  }`}
                >
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg ${
                    answers.get(currentQuestion.id) === i ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:bg-cyan-100 group-hover:text-cyan-600'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={`text-xl font-bold leading-snug ${answers.get(currentQuestion.id) === i ? 'text-cyan-950' : 'text-slate-600 group-hover:text-slate-800'}`}>{option}</span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-100">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-100 disabled:opacity-20 transition"
              >
                Previous Cell
              </button>
              <button
                disabled={currentQuestionIndex === questions.length - 1}
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-20 transition shadow-xl"
              >
                Next Cell <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;