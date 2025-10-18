import React, { FC, useState, useMemo } from 'react';
import { Check, Star, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';

interface SubscriptionOfferCardProps {
    planName: string;
    price: number;
    priceUnit: string;
    url: string; // This will now be used as a fallback.
    features: string[];
    isBestValue?: boolean;
    gradientClass: string;
}

const SubscriptionOfferCard: FC<SubscriptionOfferCardProps> = ({
    planName,
    price,
    priceUnit,
    url,
    features,
    isBestValue = false,
    gradientClass,
}) => {
    const { user, token } = useAuth();
    const { activeOrg } = useAppContext();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const sku = useMemo(() => {
        if (planName.toLowerCase().includes('monthly')) return 'sub-monthly';
        if (planName.toLowerCase().includes('yearly')) return 'sub-yearly';
        return null;
    }, [planName]);

    const handleSubscribe = async () => {
        if (!sku) {
            toast.error("Could not determine subscription type.");
            // Fallback to old method if SKU is not found
            window.location.href = url;
            return;
        }

        if (!user || !token || !activeOrg) {
            toast.error("Please log in to subscribe.");
            const loginUrl = activeOrg ? `https://www.${activeOrg.website}/exam-login/` : '#';
            window.location.href = loginUrl;
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
        <div className={`rounded-xl shadow-lg p-6 flex flex-col text-white relative ${gradientClass}`}>
            {isBestValue && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold uppercase px-3 py-1 rounded-full">
                    <Star size={12} className="inline -mt-1 mr-1" /> Best Value
                </div>
            )}
            <h3 className="text-xl font-bold text-center">{planName}</h3>
            <div className="my-4 text-center">
                <span className="text-4xl font-extrabold">${price.toFixed(2)}</span>
                <span className="text-base font-medium text-white/80">/{priceUnit}</span>
            </div>
            <ul className="space-y-2 text-sm text-white/90 mb-6">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <Check size={16} className="text-green-300 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={handleSubscribe}
                disabled={isRedirecting}
                className="mt-auto w-full flex items-center justify-center gap-2 bg-white text-slate-800 font-bold py-3 text-center rounded-lg hover:bg-slate-200 transition disabled:opacity-75"
            >
                {isRedirecting ? <Spinner /> : <ShoppingCart size={18} />} {buttonText}
            </button>
        </div>
    );
};

export default SubscriptionOfferCard;