
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exam, Organization } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { PlayCircle, ShoppingCart, BarChart2, Lock, Info, Clock, CheckCircle } from 'lucide-react';

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

const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (e) {
        console.error("Could not parse HTML string for stripping", e);
        return html;
    }
};

const ExamCard: FC<ExamCardProps> = ({ exam, programId, isPractice, isPurchased, examPrices, hideDetailsLink = false, attemptsMade, isDisabled = false }) => {
    const navigate = useNavigate();
    const { isSubscribed, isBetaTester } = useAuth();
    const hasAccess = isPractice || isPurchased || isSubscribed || isBetaTester;

    const priceInfo = examPrices ? examPrices[exam.productSku] : null;
    const price = priceInfo?.price ?? exam.price;
    const regularPrice = priceInfo?.regularPrice ?? exam.regularPrice;

    const handleActionClick = () => {
        if (isDisabled) return;
        if (isPractice) {
            navigate(`/test/${exam.id}`);
        } else if (hasAccess) {
            if (attemptsMade !== undefined && attemptsMade >= 3) {
                // If they've used all attempts, find the latest result to view
                // This logic is simplified; a real app might need to fetch the specific testId
                navigate(`/profile`); // Send them to profile to see all results
            } else {
                navigate(`/test/${exam.id}`);
            }
        } else if (exam.productSlug) {
            navigate(`/checkout/${exam.productSlug}`);
        }
    };
    
    let actionButton;
    if (isPractice) {
        actionButton = (
            <button
                onClick={handleActionClick}
                disabled={isDisabled}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-[rgb(var(--color-secondary-rgb))] text-white font-bold py-2 px-4 rounded-lg hover:bg-[rgb(var(--color-secondary-hover-rgb))] transition disabled:bg-slate-400"
            >
                <PlayCircle size={18} /> Start Practice
            </button>
        );
    } else if (hasAccess) {
        if (attemptsMade !== undefined && attemptsMade >= 3) {
             actionButton = (
                <button
                    onClick={handleActionClick}
                    disabled={isDisabled}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition disabled:bg-slate-400"
                >
                    <BarChart2 size={18} /> View Results
                </button>
            );
        } else {
            actionButton = (
                <button
                    onClick={handleActionClick}
                    disabled={isDisabled}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-slate-400"
                >
                    <PlayCircle size={18} /> Start Exam
                </button>
            );
        }
    } else {
         actionButton = (
            <button
                onClick={handleActionClick}
                disabled={isDisabled}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400"
            >
                <ShoppingCart size={18} /> Buy Now
            </button>
        );
    }

    const cardGradient = isPractice ? 'exam-card--practice' : 'exam-card--cert';

    return (
        <div className={`relative flex flex-col p-6 rounded-xl text-white shadow-lg ${cardGradient} ${isDisabled ? 'opacity-60 grayscale' : ''}`}>
            {isDisabled && (
                <div className="absolute inset-0 bg-black/30 rounded-xl z-10 flex items-center justify-center" title="Please submit feedback for your last exam to unlock this.">
                    <Lock size={24}/>
                </div>
            )}
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold">{stripHtml(exam.name)}</h3>
                {hasAccess && !isPractice && (
                    <div className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {isSubscribed ? 'SUBSCRIBED' : 'PURCHASED'}
                    </div>
                )}
            </div>
            
            <div className="text-sm mt-2 opacity-90 flex-grow prose prose-sm prose-invert max-w-none text-white/90">
                {stripHtml(exam.description)}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/20 text-sm space-y-2">
                <div className="flex justify-between">
                    <span className="opacity-80">Questions:</span>
                    <span className="font-semibold">{exam.numberOfQuestions}</span>
                </div>
                <div className="flex justify-between">
                    <span className="opacity-80">Duration:</span>
                    <span className="font-semibold">{exam.durationMinutes > 0 ? `${exam.durationMinutes} mins` : 'Untimed'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="opacity-80">Pass Score:</span>
                    <span className="font-semibold">{exam.passScore}%</span>
                </div>
                 {!isPractice && attemptsMade !== undefined && (
                    <div className="flex justify-between">
                        <span className="opacity-80">Attempts Used:</span>
                        <span className={`font-semibold ${attemptsMade >= 3 ? 'text-yellow-300' : ''}`}>{attemptsMade} / 3</span>
                    </div>
                 )}
            </div>

            {!hasAccess && !isPractice && (
                 <div className="mt-4 text-right">
                    {regularPrice > 0 && price < regularPrice && (
                        <span className="text-xl line-through opacity-70">${regularPrice.toFixed(2)}</span>
                    )}
                    <span className="text-4xl font-extrabold ml-2">${price.toFixed(2)}</span>
                </div>
            )}
           
            {actionButton}
            
            {!hideDetailsLink && (
                <button 
                    onClick={() => navigate(`/program/${programId}`)} 
                    className="w-full mt-2 text-center text-xs text-white/70 hover:text-white hover:underline transition"
                >
                    View Program Details
                </button>
            )}
        </div>
    );
};
export default ExamCard;
