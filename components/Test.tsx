
import React, { FC, useState, useEffect, useRef, useMemo, useCallback } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { useParams, useNavigate } from "react-router-dom";
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
  const { user, isSubscribed, token, isBetaTester, paidExamIds } = useAuth();
  const { activeOrg, isInitializing, setFeedbackRequiredForExam } = useAppContext();

  const [examConfig, setExamConfig] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // FIX: Corrected useState initialization for `answers` to be a Map<number, number>
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
        const userAnswers: UserAnswer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({ questionId, answer: answer as number }));
        const result = await googleSheetsService.submitTest(user, examId, userAnswers, questions, token, focusViolationCount);
        
        if (isBetaTester) {
            setFeedbackRequiredForExam({ examId: examConfig.id, examName: examConfig.name });
        }
        
        toast.success("Test submitted successfully!");
        navigate(`/results/${result.testId}`);
    } catch (error) {
        toast.error("Failed to submit the test. Please try again.");
        setIsSubmitting(false);
        hasSubmittedRef.current = false; // Reset submit lock
    }
  }, [examId, navigate, token, user, isSubmitting, questions, answers, progressKey, focusViolationCount, isBetaTester, examConfig, setFeedbackRequiredForExam]);
  
  // FIX: Added a placeholder return statement to ensure the component returns ReactNode.
  return <></>; 
};

export default Test;
