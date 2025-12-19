
import React, { FC, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    if (!isPractice) {
        if (canTake) {
            buttonText = 'Start Exam';
        } else {
            buttonText = isRedirecting ? 'Preparing...' : 'Add to Cart';
        }
    }

    const handleButtonClick = async () => {
        if (token) {
            googleSheetsService.logEngagement(token, exam.id);
        }
        
        if (canTake) {
            navigate(`/test/${exam.id}`);
        } else if (exam.productSku) {
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
        } else {
            toast.error("This exam is not available for purchase at the moment.");
        }
    };

    const Icon = isPractice ? BookOpen : Award;
    const headerText = isPractice ? "Practice Exam" : (exam.certificateEnabled ? "Certification Exam" : "Proficiency Exam");
    
    const buttonTitle = isDisabled 
        ? "Please submit feedback for your last exam before starting a new one."
        : (isPractice ? "Start a free practice exam" : (canTake ? "Start your certification exam" : "Purchase this exam"));


    return (
        <div className={`rounded-xl shadow-lg overflow-hidden flex flex-col text-white relative ${isPractice ? 'bg-blue-600' : 'bg-emerald-600'} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-full">
                            <Icon size={20} />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-wider">{headerText}</span>
                    </div>
                    {isPractice && (
                        <span className="bg-green-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full shadow-md">
                            Free
                        </span>
                    )}
                </div>
                
                <h3 className="text-lg font-bold mb-2 leading-tight">{decodeHtml(exam.name)}</h3>
                
                <p className="text-sm text-white/90 mb-4 line-clamp-3 flex-grow">
                    {stripHtml(exam.description)}
                </p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/80 mb-4 p-3 bg-black/10 rounded-md">
                    <span><HelpCircle size={14} className="inline mr-1" />{exam.numberOfQuestions || 0} Qs</span>
                    <span><Clock size={14} className="inline mr-1" />{exam.durationMinutes || 0} Mins</span>
                    <span><CheckCircle size={14} className="inline mr-1" />{exam.passScore || 70}% Pass</span>
                </div>
                
                {!canTake && price > 0 && (
                    <div className="text-center mb-4">
                        {regularPrice > price ? (
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-xl line-through text-white/70">${regularPrice.toFixed(2)}</span>
                                <span className="text-4xl font-extrabold text-white">${price.toFixed(2)}</span>
                            </div>
                        ) : (
                            <span className="text-4xl font-extrabold text-white">${price.toFixed(2)}</span>
                        )}
                    </div>
                )}

                <div className="mt-auto space-y-2">
                    <button
                        onClick={handleButtonClick}
                        disabled={isRedirecting || isDisabled}
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-75 ${
                            isDisabled 
                                ? 'bg-slate-400 text-slate-800 cursor-not-allowed'
                                : (canTake
                                    ? 'bg-white text-slate-800 hover:bg-slate-200'
                                    : 'bg-yellow-400 hover:bg-yellow-500 text-slate-800')
                        }`}
                        title={buttonTitle}
                    >
                        {isRedirecting ? <Spinner /> : (isPractice ? <PlayCircle size={18} /> : (canTake ? <PlayCircle size={18} /> : <ShoppingCart size={18} />))}
                        {buttonText}
                    </button>
                    {!hideDetailsLink && (
                        <Link
                            to={`/program/${programId}`}
                            className={`block w-full text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-3 rounded-lg text-sm transition ${isDisabled ? 'pointer-events-none' : ''}`}>
                            View Details
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamCard;
