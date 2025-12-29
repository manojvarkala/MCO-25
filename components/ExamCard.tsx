

import React, { FC, useState } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { useNavigate, Link } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization } from '../types.ts';
import { Award, BookOpen, CheckCircle, Clock, HelpCircle, History, PlayCircle, ShoppingCart } from 'lucide-react';
import Spinner from './Spinner.tsx';

export interface ExamCardProps {
    exam: Exam;
    programId: string;
    isPractice: boolean;
    isPurchased: boolean;
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
    hideDetailsLink?: boolean;
    attemptsMade?: number;
    isDisabled?: boolean;
}

const decodeHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for decoding", e);
        return html;
    }
};

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        return html;
    }
};

const ExamCard: FC<ExamCardProps> = ({ exam, programId, isPractice, isPurchased, activeOrg, examPrices, hideDetailsLink = false, attemptsMade, isDisabled = false }) => {
    const navigate = useNavigate();
    const { user, token, isSubscribed, isBetaTester } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const canTake = isPractice || isPurchased || isSubscribed || isBetaTester;
    
    const priceInfo = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
    const price = priceInfo?.price ?? (exam.price || 0);
    const regularPrice = priceInfo?.regularPrice ?? (exam.regularPrice || 0);
    
    let buttonText = 'Start Practice';
    let buttonAction: () => void;
    let buttonClasses = "w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50";
    let icon = <PlayCircle size={18} />;

    if (!isPractice) { // Certification Exam
        if (canTake) {
            buttonText = 'Start Exam';
            buttonAction = () => {
                if (isDisabled) {
                    toast.error("You must submit feedback for previous beta exams to unlock this test.");
                    return;
                }
                navigate(`/test/${exam.id}`);
            };
        } else {
            buttonText = isRedirecting ? 'Preparing...' : `Buy for $${price.toFixed(2)}`;
            icon = isRedirecting ? <Spinner /> : <ShoppingCart size={18} />;
            buttonClasses = "w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50";
            buttonAction = async () => {
                if (!user || !token) {
                    toast.error("Please log in to make a purchase.");
                    const loginUrl = `https://www.${activeOrg.website}/exam-login/`;
                    window.location.href = loginUrl;
                    return;
                }
                setIsRedirecting(true);
                try {
                    const { checkoutUrl } = await googleSheetsService.createCheckoutSession(token, exam.productSku);
                    window.location.href = checkoutUrl;
                } catch (error: any) {
                    toast.error(`Could not prepare checkout: ${error.message}`);
                    setIsRedirecting(false);
                }
            };
        }
    } else { // Practice Exam
        buttonAction = () => navigate(`/test/${exam.id}`);
    }

    const maxAttempts = isPractice ? 10 : 3;
    const attemptsRemaining = maxAttempts - (attemptsMade || 0);
    const isAttemptsExceeded = !isPractice && attemptsMade !== undefined && attemptsRemaining <= 0 && !isSubscribed && !isBetaTester;


    return (
        <div className={`bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-md border border-[rgb(var(--color-border-rgb))] p-6 flex flex-col ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPractice ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {isPractice ? <BookOpen size={20} /> : <Award size={20} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-[rgb(var(--color-text-strong-rgb))] leading-tight">{decodeHtml(exam.name)}</h3>
                        <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">{isPractice ? 'Practice Test' : 'Certification Exam'}</p>
                    </div>
                </div>
            </div>

            <p className="text-[rgb(var(--color-text-default-rgb))] text-sm flex-grow mb-4 line-clamp-3">
                {stripHtml(exam.description)}
            </p>

            <div className="space-y-2 text-sm text-[rgb(var(--color-text-muted-rgb))] mb-6">
                <div className="flex items-center gap-2"><HelpCircle size={16} /> <span>{exam.numberOfQuestions} Questions</span></div>
                <div className="flex items-center gap-2"><Clock size={16} /> <span>{exam.durationMinutes > 0 ? `${exam.durationMinutes} Minutes` : 'Untimed'}</span></div>
                <div className="flex items-center gap-2"><CheckCircle size={16} /> <span>{exam.passScore}% Passing Score</span></div>
                {!isPractice && attemptsMade !== undefined && (
                    <div className="flex items-center gap-2">
                        <History size={16} /> 
                        <span>Attempts: {attemptsMade}/{maxAttempts} ({attemptsRemaining <= 0 ? 'Exceeded' : `${attemptsRemaining} Remaining`})</span>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-[rgb(var(--color-border-rgb))]">
                {!isPractice && !canTake && regularPrice > price && (
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-[rgb(var(--color-text-muted-rgb))] line-through">${regularPrice.toFixed(2)}</span>
                        <span className="font-bold text-lg text-red-500">Save ${((regularPrice - price) || 0).toFixed(2)}!</span>
                    </div>
                )}
                
                {isAttemptsExceeded ? (
                    <p className="text-red-500 text-sm font-semibold text-center mt-2">All attempts used. Purchase to reset.</p>
                ) : (
                    <button
                        onClick={buttonAction}
                        disabled={isRedirecting || isAttemptsExceeded || isDisabled}
                        className={buttonClasses}
                    >
                        {icon} {buttonText}
                    </button>
                )}
                
                {!hideDetailsLink && (
                    <Link to={`/program/${programId}`} className="block text-center mt-3 text-sm font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">
                        View Program Details
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ExamCard;