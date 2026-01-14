import React, { FC, useState } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM as any;
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
    } catch (e) { return html; }
};

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) { return html; }
};

const ExamCard: FC<ExamCardProps> = ({ exam, programId, isPractice, isPurchased, activeOrg, examPrices, hideDetailsLink = false, attemptsMade, isDisabled = false }) => {
    const navigate = useNavigate();
    const { user, token, isSubscribed, isBetaTester } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const canTake = isPractice || isPurchased || isSubscribed || isBetaTester;
    const priceInfo = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
    const price = priceInfo?.price ?? (exam.price || 0);
    const regularPrice = priceInfo?.regularPrice ?? (exam.regularPrice || 0);
    
    let buttonText = isPractice ? 'Start Practice' : (canTake ? 'Start Exam' : `Buy for $${price.toFixed(2)}`);
    let icon = isRedirecting ? <Spinner size="sm" /> : (isPractice || canTake ? <PlayCircle size={18} /> : <ShoppingCart size={18} />);
    
    // Gradient Selection
    const cardGradient = isPractice ? 'mco-gradient--practice-1' : 'mco-gradient--cert-1';
    
    // Button Logic: White buttons on colored cards, Amber for commerce
    const buttonBase = "mco-card__button ";
    const buttonVariant = canTake ? "mco-card__button--white" : "mco-card__button--amber";
    const buttonClasses = `${buttonBase} ${buttonVariant} disabled:opacity-50`;

    const buttonAction = async () => {
        if (isDisabled) {
            toast.error("Complete required feedback to unlock.");
            return;
        }
        if (isPractice || canTake) {
            navigate(`/test/${exam.id}`);
            return;
        }
        if (!user || !token) {
            toast.error("Please log in to purchase.");
            window.location.href = `https://www.${activeOrg.website}/exam-login/`;
            return;
        }
        setIsRedirecting(true);
        try {
            const { checkoutUrl } = await googleSheetsService.createCheckoutSession(token, exam.productSku);
            window.location.href = checkoutUrl;
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
            setIsRedirecting(false);
        }
    };

    const maxAttempts = isPractice ? 10 : 3;
    const attemptsRemaining = maxAttempts - (attemptsMade || 0);
    const isAttemptsExceeded = !isPractice && attemptsMade !== undefined && attemptsRemaining <= 0 && !isSubscribed && !isBetaTester;

    return (
        <div className={`mco-card ${cardGradient} rounded-xl shadow-lg p-6 flex flex-col relative overflow-hidden ${isDisabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            {/* Header Area */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/20 text-white backdrop-blur-sm`}>
                        {isPractice ? <BookOpen size={20} /> : <Award size={20} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white leading-tight">{decodeHtml(exam.name)}</h3>
                        <p className="text-[10px] uppercase tracking-widest font-black text-white/70 mt-1">
                            {isPractice ? 'Practice Test' : 'Certification Exam'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Description */}
            <p className="text-white/90 text-sm flex-grow mb-6 line-clamp-3 leading-relaxed relative z-10">
                {stripHtml(exam.description)}
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 text-xs text-white mb-6 bg-black/20 p-3 rounded-lg border border-white/10 relative z-10">
                <div className="flex items-center gap-2 font-bold">
                    <HelpCircle size={14} className="text-white/60" /> 
                    <span>{exam.numberOfQuestions} Qs</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                    <Clock size={14} className="text-white/60" /> 
                    <span>{exam.durationMinutes > 0 ? `${exam.durationMinutes}m` : 'Untimed'}</span>
                </div>
                {!isPractice && attemptsMade !== undefined && (
                    <div className="col-span-2 mt-1 pt-1 border-t border-white/10 flex items-center gap-2 font-bold">
                        <History size={14} className="text-white/60" /> 
                        <span className={attemptsRemaining <= 0 ? 'text-red-300 animate-pulse' : ''}>
                            Attempts: {attemptsMade}/{maxAttempts}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer Action */}
            <div className="mt-auto relative z-10">
                {!isPractice && !canTake && regularPrice > price && (
                    <div className="flex justify-between items-center text-[10px] mb-3 bg-white/10 p-2 rounded border border-white/5">
                        <span className="text-white/60 line-through">${regularPrice.toFixed(2)}</span>
                        <span className="font-black text-yellow-300 uppercase tracking-tighter">Save ${((regularPrice - price) || 0).toFixed(2)}</span>
                    </div>
                )}
                
                {isAttemptsExceeded ? (
                    <div className="bg-red-500/20 text-white p-3 rounded-lg text-[10px] font-black text-center border border-red-500/30">
                        ATTEMPTS EXCEEDED. PURCHASE TO RESET.
                    </div>
                ) : (
                    <button 
                        onClick={buttonAction} 
                        disabled={isRedirecting || isAttemptsExceeded || isDisabled} 
                        className={buttonClasses}
                    >
                        {icon} <span className="uppercase">{buttonText}</span>
                    </button>
                )}
                
                {!hideDetailsLink && (
                    <Link to={`/program/${programId}`} className="block text-center mt-4 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                        View Full Program Info →
                    </Link>
                )}
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        </div>
    );
};
export default ExamCard;