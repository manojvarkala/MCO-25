import * as React from 'react';
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

  const [examConfig, setExamConfig] = React.useState<Exam | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  
  const timerIntervalRef = React.useRef<number | null>(null);

  const handleSubmit = React.useCallback(async (isAutoSubmit = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!user || !examId || !token || questions.length === 0) {
        toast.error("Cannot submit: user or exam context is missing.");
        navigate('/');
        setIsSubmitting(false);
        return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    localStorage.removeItem(`exam_timer_${examId}_${user.id}`);

    if (!isAutoSubmit) {
        const unansweredCount = questions.length - answers.size;
        if (unansweredCount > 0 && !window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
            setIsSubmitting(false);
            return;
        }
    }
    
    try {
        const userAnswers: UserAnswer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({ questionId, answer }));
        const result = await googleSheetsService.submitTest(user, examId, userAnswers, questions, token);
        toast.success("Test submitted successfully!");
        navigate(`/results/${result.testId}`);
    } catch (error) {
        toast.error("Failed to submit the test. Please try again.");
        setIsSubmitting(false);
    }
  }, [examId, navigate, token, user, isSubmitting, questions, answers]);

  // Effect 1: Load questions.
  React.useEffect(() => {
    if (isInitializing || !examId || !activeOrg || !user || !token) {
        return;
    }

    const config = activeOrg.exams.find(e => e.id === examId);
    if (!config) {
        toast.error("Could not find the specified exam.");
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
                useFreeAttempt();
            } else {
                const certResults = userResults.filter(r => r.examId === config.id);
                if (certResults.some(r => r.score >= config.passScore)) throw new Error("You have already passed this exam.");
                if (certResults.length >= 3) throw new Error("You have used all 3 attempts for this exam.");
            }
            const fetchedQuestions = await googleSheetsService.getQuestions(config, token);
            setQuestions(fetchedQuestions);
            setAnswers(new Map());
            setCurrentQuestionIndex(0);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load test.', { duration: 4000 });
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };
    
    loadTest();
  }, [examId, activeOrg, isInitializing, user, isSubscribed, token, navigate, useFreeAttempt]);

  // Effect 2: Manage the timer.
  React.useEffect(() => {
    if (isLoading || !examConfig || !user || !examId) return;

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
            handleSubmit(true);
        }
    }, 1000);

    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isLoading, examConfig, user, examId, handleSubmit]);

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
    return <div className="flex flex-col items-center justify-center h-screen bg-white"><LogoSpinner /><p className="mt-4 text-slate-600">Loading your test...</p></div>;
  }

  if (questions.length === 0) {
    return <div className="text-center p-8 bg-white h-screen flex items-center justify-center"><p>No questions available for this exam.</p></div>
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex-shrink-0 p-4 sm:p-6 border-b border-slate-200">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{examConfig.name}</h1>
                <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-cyan-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </header>
      
      <div className="flex-shrink-0 p-3 border-b border-slate-200 overflow-x-auto">
        <div className="flex flex-nowrap gap-2">
          {questions.map((q, index) => {
            const isAnswered = answers.has(q.id);
            const isCurrent = index === currentQuestionIndex;
            let buttonClass = 'border-slate-300 bg-white hover:bg-slate-100 text-slate-600';
            if (isCurrent) {
              buttonClass = 'bg-cyan-600 border-cyan-600 text-white ring-2 ring-offset-1 ring-cyan-500';
            } else if (isAnswered) {
              buttonClass = 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-700';
            }
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold border transition-colors duration-200 ${buttonClass}`}
                aria-label={`Go to question ${index + 1}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
      
      <main className="flex-grow p-6 sm:p-8 overflow-y-auto">
        <div className="mb-8">
            <p className="text-lg font-semibold text-slate-700 leading-relaxed">{currentQuestion.question}</p>
        </div>
        <div className="space-y-4">
            {currentQuestion.options.map((option, index) => (
            <label 
                key={index} 
                onDoubleClick={() => handleDoubleClickOption(currentQuestion.id, index)}
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${answers.get(currentQuestion.id) === index ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500' : 'border-slate-300 hover:border-cyan-400'}`}>
                <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                checked={answers.get(currentQuestion.id) === index}
                onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                className="h-5 w-5 mt-0.5 text-cyan-600 focus:ring-cyan-500 border-slate-300"
                />
                <span className="ml-4 text-slate-700">{option}</span>
            </label>
            ))}
        </div>
      </main>
      
      <footer className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 bg-white">
        <div className="flex justify-between items-center">
            <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0 || isSubmitting}
            className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
            <ChevronLeft size={16} />
            <span>Previous</span>
            </button>

            {timeLeft !== null && (
                <div className="flex items-center space-x-2 bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg">
                    <Clock size={20} />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            )}
            
            {currentQuestionIndex === questions.length - 1 ? (
            <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-green-300 disabled:cursor-not-allowed"
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
      </footer>
    </div>
  );
};

export default Test;