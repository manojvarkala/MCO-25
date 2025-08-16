import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Question, UserAnswer, Exam } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { ChevronLeft, ChevronRight, Send, Clock } from 'lucide-react';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Test: React.FC = () => {
  const { examId } = ReactRouterDOM.useParams<{ examId: string }>();
  const navigate = ReactRouterDOM.useNavigate();
  const { user, useFreeAttempt, isSubscribed, token } = useAuth();
  const { activeOrg, isInitializing } = useAppContext();

  const [examConfig, setExamConfig] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Use refs to hold the latest state for the timer callback
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    const currentAnswers = answersRef.current;
    const currentQuestions = questionsRef.current;

    if (!isAutoSubmit) {
        const unansweredQuestionsCount = currentQuestions.length - currentAnswers.size;
        if (unansweredQuestionsCount > 0) {
            const confirmed = window.confirm(
                `You have ${unansweredQuestionsCount} unanswered question(s). Are you sure you want to submit?`
            );
            if (!confirmed) return;
        }
    }
    
    if(!user || !examId || !token) {
        toast.error("Cannot submit: user or exam context is missing.");
        navigate('/');
        return;
    }

    setIsSubmitting(true);
    if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    localStorage.removeItem(`exam_timer_${examId}_${user.id}`);

    try {
        const userAnswers: UserAnswer[] = Array.from(currentAnswers.entries()).map(([questionId, answer]) => ({
            questionId,
            answer,
        }));
        
        const result = await googleSheetsService.submitTest(user, examId, userAnswers, currentQuestions, token);
        toast.success("Test submitted successfully!");
        navigate(`/results/${result.testId}`);

    } catch(error) {
        toast.error("Failed to submit the test. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  }, [examId, navigate, token, user]);

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (isInitializing || !examId || !activeOrg) return;

    const config = activeOrg.exams.find(e => e.id === examId);
    if (!config) {
        toast.error("Could not find the specified exam.");
        navigate('/dashboard');
        return;
    }
    setExamConfig(config);

    const loadTest = async () => {
      if (!user || !token) {
          navigate('/');
          return;
      }

      try {
        const userResults = googleSheetsService.getLocalTestResultsForUser(user.id);
        
        if (config.isPractice) {
            if (!isSubscribed) {
              const practiceExamIds = new Set(activeOrg.exams.filter(e => e.isPractice).map(e => e.id));
              const practiceAttempts = userResults.filter(r => practiceExamIds.has(r.examId)).length;
              if (practiceAttempts >= 10) {
                toast.error("You have used all 10 of your free practice attempts.", { duration: 4000 });
                navigate('/dashboard');
                return;
              }
            }
            useFreeAttempt();
        } else {
            const certExamResults = userResults.filter(r => r.examId === config.id);
            const hasPassed = certExamResults.some(r => r.score >= config.passScore);
            
            if (hasPassed) {
                toast.error("You have already passed this exam.", { duration: 4000 });
                navigate('/dashboard');
                return;
            }
            if (certExamResults.length >= 3) {
                toast.error("You have used all 3 attempts for this exam.", { duration: 4000 });
                navigate('/dashboard');
                return;
            }
        }

        setIsLoading(true);
        const fetchedQuestions = await googleSheetsService.getQuestions(config, token);
        setQuestions(fetchedQuestions);

        const timerKey = `exam_timer_${examId}_${user.id}`;
        let endTime = localStorage.getItem(timerKey);
        if (!endTime) {
            const duration = config.durationMinutes || 90;
            endTime = (Date.now() + duration * 60 * 1000).toString();
            localStorage.setItem(timerKey, endTime);
        }
        
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = window.setInterval(() => {
            const remaining = Math.max(0, Math.round((parseInt(endTime!) - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) {
                if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                localStorage.removeItem(timerKey);
                toast.error("Time's up! Your test has been submitted automatically.");
                handleSubmitRef.current(true);
            }
        }, 1000);

      } catch (error: any) {
        toast.error(error.message || 'Failed to load the test.');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadTest();
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [examId, activeOrg, navigate, useFreeAttempt, isInitializing, user, isSubscribed, token]);

  const handleAnswerSelect = (questionId: number, optionIndex: number) => {
    setAnswers(prev => new Map(prev).set(questionId, optionIndex));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleDoubleClickOption = (questionId: number, optionIndex: number) => {
    handleAnswerSelect(questionId, optionIndex);
    if (currentQuestionIndex < questions.length - 1) {
        setTimeout(() => handleNext(), 200);
    }
  };

  if (isInitializing || isLoading || !examConfig) {
    return <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-md"><LogoSpinner /><p className="mt-4 text-slate-600">Loading your test...</p></div>;
  }

  if (questions.length === 0) {
    return <div className="text-center p-8 bg-white rounded-lg shadow-md"><p>No questions available for this exam.</p></div>
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{examConfig.name}</h1>
            <p className="text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        {timeLeft !== null && (
            <div className="flex items-center space-x-2 bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg">
                <Clock size={20} />
                <span>{formatTime(timeLeft)}</span>
            </div>
        )}
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
        <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Question Navigator */}
      <div className="mb-8 border-t border-b border-slate-200 py-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Question Navigator</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => {
            const isAnswered = answers.has(q.id);
            const isCurrent = index === currentQuestionIndex;
            let buttonClass = 'border-slate-300 bg-white hover:bg-slate-100 text-slate-600';
            if (isCurrent) {
              buttonClass = 'bg-cyan-600 border-cyan-600 text-white';
            } else if (isAnswered) {
              buttonClass = 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-700';
            }
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold border transition-colors duration-200 ${buttonClass}`}
                aria-label={`Go to question ${index + 1}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="mb-8 min-h-[80px]">
        <p className="text-lg font-semibold text-slate-700">{currentQuestion.question}</p>
      </div>

      <div className="space-y-4 mb-8">
        {currentQuestion.options.map((option, index) => (
          <label 
            key={index} 
            onDoubleClick={() => handleDoubleClickOption(currentQuestion.id, index)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${answers.get(currentQuestion.id) === index ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500' : 'border-slate-300 hover:border-cyan-400'}`}>
            <input
              type="radio"
              name={`question-${currentQuestion.id}`}
              checked={answers.get(currentQuestion.id) === index}
              onChange={() => handleAnswerSelect(currentQuestion.id, index)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-300"
            />
            <span className="ml-4 text-slate-700">{option}</span>
          </label>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0 || isSubmitting}
          className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
        
        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-green-300"
          >
            {isSubmitting ? <Spinner /> : <><Send size={16}/> <span>Submit</span></>}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Test;