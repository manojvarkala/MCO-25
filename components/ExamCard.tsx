import React, { FC, useState, useMemo } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM as any;
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Exam, Organization } from '../types.ts';
import { Award, BookOpen, Clock, HelpCircle, History, PlayCircle, ShoppingCart, Zap, Tag } from 'lucide-react';
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
    const { user, token, isSubscribed, isBetaTester, programExpiries } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const hasScopedPremium = useMemo(() => {
        if (!exam.productSku) return false;
        const expiry = programExpiries[exam.productSku];
        return !!(expiry && expiry > (Date.now() / 1000));
    }, [exam.productSku, programExpiries]);

    const canTake = useMemo(() => {
        if (isSubscribed || isBetaTester) return true;
        if (isPractice) return true; 
        return isPurchased || hasScopedPremium;
    }, [isSubscribed, isBetaTester, isPractice, isPurchased, hasScopedPremium]);

    const priceInfo = examPrices && exam.productSku ? examPrices[exam.productSku] : null;
    const price = priceInfo?.price ?? (exam.price || 0);
    const regularPrice = priceInfo?.regularPrice ?? (exam.regularPrice || 0);
    const isOnSale = regularPrice > price && price > 0;
    
    // Choose Button Appearance
    let buttonText = isPractice ? 'Start Practice' : (canTake ? 'Start Certification' : `Buy Exam • $${price.toFixed(2)}`);
    let buttonVariant = "mco-card__button--white"; // Default for Start
    
    if (!canTake && !isPractice) {
        buttonVariant = "mco-card__button--amber"; // Commerce style
    } else if (!isPractice && canTake) {
        buttonVariant = "mco-card__button--cyan"; // Purchased/Unlocked style
    }

    const icon = isRedirecting ? <Spinner size="sm" /> : (isPractice || canTake ? <PlayCircle size={20} /> : <ShoppingCart size={20} />);
    const cardGradient = isPractice ? 'mco-gradient--practice-1' : 'mco-gradient--cert-1';

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
    const isAttemptsExceeded = !isPractice && attemptsMade !== undefined && attemptsRemaining <= 0 && !isSubscribed && !isBetaTester && !hasScopedPremium;

    return (
        <div className={`mco-card ${cardGradient} rounded-2xl shadow-xl p-6 flex flex-col relative overflow-hidden ${isDisabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            {/* Sale Badge */}
            {isOnSale && !canTake && (
                <div className="mco-badge--save">
                    <Tag size={10} /> SAVE ${ (regularPrice - price).toFixed(0) }
                </div>
            )}

            {/* Header Area */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/20 text-white backdrop-blur-md border border-white/10">
                        {isPractice ? <BookOpen size={22} /> : <Award size={22} />}
                    </div>
                    <div>
                        <div className="flex flex-col">
                             <h3 className="text-xl font-black text-white leading-tight">{decodeHtml(exam.name)}</h3>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] uppercase tracking-widest font-black text-white/60">
                                    {isPractice ? 'Simulated' : 'Official Credentials'}
                                </span>
                                {hasScopedPremium && !isSubscribed && (
                                    <span className="bg-amber-400 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                        <Zap size={8} className="fill-current"/> Premium
                                    </span>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            <p className="text-white/80 text-xs font-medium flex-grow mb-6 line-clamp-3 leading-relaxed relative z-10 italic">
                {stripHtml(exam.description)}
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-white mb-6 bg-white/10 p-3 rounded-xl border border-white/10 relative z-10">
                <div className="flex items-center gap-2 font-black uppercase tracking-tighter">
                    <HelpCircle size={14} className="text-white/40" /> 
                    <span>{exam.numberOfQuestions} Questions</span>
                </div>
                <div className="flex items-center gap-2 font-black uppercase tracking-tighter">
                    <Clock size={14} className="text-white/40" /> 
                    <span>{exam.durationMinutes > 0 ? `${exam.durationMinutes} Minutes` : 'Untimed'}</span>
                </div>
                {!isPractice && attemptsMade !== undefined && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-white/10 flex items-center gap-2 font-black uppercase tracking-tighter">
                        <History size={14} className="text-white/40" /> 
                        <span className={attemptsRemaining <= 0 ? 'text-red-300 animate-pulse' : ''}>
                            Progress: {attemptsMade} / {maxAttempts} Attempts Used
                        </span>
                    </div>
                )}
            </div>

            {/* Footer Action */}
            <div className="mt-auto relative z-10">
                {isAttemptsExceeded ? (
                    <div className="bg-red-50/20 text-white p-4 rounded-xl text-[10px] font-black text-center border border-red-500/30 backdrop-blur-md">
                        MAX ATTEMPTS REACHED. REPURCHASE REQUIRED.
                    </div>
                ) : (
                    <button 
                        onClick={buttonAction} 
                        disabled={isRedirecting || isAttemptsExceeded || isDisabled} 
                        className={`mco-card__button ${buttonVariant}`}
                    >
                        {icon} <span className="truncate">{buttonText}</span>
                    </button>
                )}
                
                {!hideDetailsLink && (
                    <Link to={`/program/${programId}`} className="block text-center mt-4 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                        Complete Syllabus Details →
                    </Link>
                )}
            </div>

            {/* Visual Decoration */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );
};
export default ExamCard;