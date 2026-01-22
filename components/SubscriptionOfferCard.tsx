import React, { FC, useState, useMemo } from 'react';
import { Check, Star, ShoppingCart, Zap, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';

interface SubscriptionOfferCardProps {
    planName: string;
    price: number;
    regularPrice?: number;
    priceUnit: string;
    url: string;
    features: string[];
    isBestValue?: boolean;
    gradientClass: string;
}

const SubscriptionOfferCard: FC<SubscriptionOfferCardProps> = ({
    planName,
    price,
    regularPrice,
    priceUnit,
    url,
    features,
    isBestValue = false,
    gradientClass,
}) => {
    const { user, token } = useAuth();
    const { activeOrg, examPrices } = useAppContext();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const sku = useMemo(() => {
        if (planName.toLowerCase().includes('monthly')) return 'sub-monthly';
        if (planName.toLowerCase().includes('yearly')) return 'sub-yearly';
        return null;
    }, [planName]);

    // Calculate specific savings for Yearly vs Monthly
    const yearlySavings = useMemo(() => {
        if (sku !== 'sub-yearly' || !examPrices) return 0;
        const monthlyPrice = examPrices['sub-monthly']?.price || 19.99;
        const totalMonthlyCost = monthlyPrice * 12;
        const currentYearlyPrice = price;
        return totalMonthlyCost > currentYearlyPrice ? (totalMonthlyCost - currentYearlyPrice) : 0;
    }, [sku, examPrices, price]);

    const handleSubscribe = async () => {
        if (!sku) {
            window.location.href = url;
            return;
        }

        if (!user || !token || !activeOrg) {
            toast.error("Please log in to subscribe.");
            window.location.href = `https://www.${activeOrg?.website || 'annapoornainfo.com'}/exam-login/`;
            return;
        }

        setIsRedirecting(true);
        try {
            const { checkoutUrl } = await googleSheetsService.createCheckoutSession(token, sku);
            window.location.href = checkoutUrl;
        } catch (error: any) {
            toast.error(`Could not prepare checkout: ${error.message}`);
            setIsRedirecting(false);
        }
    };
    
    const buttonText = isRedirecting ? 'Preparing...' : 'Subscribe Now';

    return (
        <div className={`relative flex flex-col p-8 rounded-3xl shadow-2xl text-white transition-transform hover:scale-[1.02] border border-white/10 overflow-hidden ${gradientClass}`}>
            {isBestValue && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg border-2 border-white/20 flex items-center gap-1.5 whitespace-nowrap z-20">
                    <Star size={12} className="fill-current" /> Best Value Path
                </div>
            )}

            {/* Animated Save Badge for Yearly */}
            {yearlySavings > 0 && (
                <div className="mco-badge--save">
                    <Tag size={10} /> SAVE ${yearlySavings.toFixed(0)}/YR
                </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-black">{planName}</h3>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Premium Pass</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    <Zap size={24} className="text-yellow-300 fill-current" />
                </div>
            </div>

            <div className="mb-8">
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tighter">${price.toFixed(2)}</span>
                    <span className="text-white/60 font-bold text-lg">/{priceUnit}</span>
                </div>
                {regularPrice && regularPrice > price && (
                    <p className="text-white/40 text-sm font-bold line-through mt-1">Regular Price: ${regularPrice.toFixed(2)}</p>
                )}
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <div className="mt-0.5 bg-white/20 p-1 rounded-full">
                            <Check size={12} className="text-white" strokeWidth={4} stroke="currentColor" />
                        </div>
                        <span className="text-sm font-semibold text-white/90">{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={handleSubscribe}
                disabled={isRedirecting}
                className="w-full flex items-center justify-center gap-2 bg-white py-4 rounded-2xl text-slate-900 font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-slate-100 transition active:scale-95 disabled:opacity-50"
            >
                {isRedirecting ? <Spinner size="sm" /> : <ShoppingCart size={18} />} 
                {buttonText}
            </button>
        </div>
    );
};

export default SubscriptionOfferCard;