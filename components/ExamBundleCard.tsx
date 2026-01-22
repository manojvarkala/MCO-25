import React, { FC, useMemo, useState } from 'react';
import { ShoppingBag, Check, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { Organization } from '../types.ts';
import Spinner from './Spinner.tsx';

interface ExamBundleCardProps {
    type: 'practice' | 'subscription';
    bundleDataRaw: any; // The raw product object from examPrices
    activeOrg: Organization;
    examPrices: { [key: string]: any } | null;
}

const ExamBundleCard: FC<ExamBundleCardProps> = ({ type, bundleDataRaw, activeOrg }) => {
    const { user, token } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const bundleInfo = useMemo(() => {
        if (!bundleDataRaw || !bundleDataRaw.sku) {
            return null;
        }

        const isPracticeBundle = type === 'practice';
        
        const title = isPracticeBundle ? 'Exam Bundle' : 'Exam + Subscription';
        const description = isPracticeBundle
            ? 'The complete package for your certification.'
            : 'Get the certification exam plus one month of full subscription benefits.';
        const gradientClass = isPracticeBundle
            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
            : 'bg-gradient-to-br from-teal-400 to-cyan-500';
        const buttonClass = isPracticeBundle
            ? 'text-orange-600 hover:bg-orange-50'
            : 'text-cyan-600 hover:bg-cyan-50';
            
        const features = isPracticeBundle
            ? ['One Certification Exam', '1-Month Unlimited Practice', '1-Month Unlimited AI Feedback']
            : ['One Certification Exam', '1-Month Full Subscription', 'Incl. Unlimited Practice & AI Feedback'];

        return {
            title,
            sku: bundleDataRaw.sku, // Use actual SKU from object
            price: bundleDataRaw.price,
            regularPrice: bundleDataRaw.regularPrice,
            description,
            gradientClass,
            buttonClass,
            features,
        };
    }, [type, bundleDataRaw]);

    const handlePurchase = async () => {
        if (!bundleInfo?.sku) return;
        if (!user || !token) {
            toast.error("Please log in to make a purchase.");
            const loginUrl = `https://www.${activeOrg.website}/exam-login/`;
            window.location.href = loginUrl;
            return;
        }
        setIsRedirecting(true);
        try {
            const { checkoutUrl } = await googleSheetsService.createCheckoutSession(token, bundleInfo.sku);
            window.location.href = checkoutUrl;
        } catch (error: any) {
            toast.error(`Could not prepare checkout: ${error.message}`);
            setIsRedirecting(false);
        }
    };

    if (!bundleInfo) {
        return null;
    }

    const buttonText = isRedirecting ? 'Preparing...' : 'Purchase Bundle';
    const hasSale = bundleInfo.regularPrice > bundleInfo.price;

    return (
        <div className={`${bundleInfo.gradientClass} text-white rounded-xl shadow-lg p-6 flex flex-col relative overflow-hidden`}>
            {/* Animated Corner Ribbon */}
            {hasSale && (
                <div className="mco-badge--save">
                    SAVE ${(bundleInfo.regularPrice - bundleInfo.price).toFixed(0)}
                </div>
            )}

            <h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={20} /> {bundleInfo.title}</h3>
            <p className="text-sm text-white/80 mt-2 mb-4 flex-grow">
                {bundleInfo.description}
            </p>

            <div className="my-4 text-center">
                {hasSale ? (
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-2xl line-through text-white/70">${bundleInfo.regularPrice.toFixed(2)}</span>
                        <span className="text-4xl font-extrabold text-white">${bundleInfo.price.toFixed(2)}</span>
                    </div>
                ) : (
                    <span className="text-4xl font-extrabold text-white">${bundleInfo.price.toFixed(2)}</span>
                )}
            </div>

            <ul className="space-y-2 text-sm text-white/90 mb-6 text-left">
                {bundleInfo.features.map((feature, index) => (
                    <li key={index} className={`flex items-start gap-2 ${feature.startsWith('Incl.') ? 'pl-6 text-xs text-white/80' : ''}`}>
                       {!feature.startsWith('Incl.') && <Check size={16} className="text-green-300 flex-shrink-0 mt-0.5" />}
                       <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={handlePurchase}
                disabled={isRedirecting}
                className={`mt-auto w-full flex items-center justify-center gap-2 bg-white font-bold py-3 text-center rounded-lg transition disabled:opacity-75 ${bundleInfo.buttonClass}`}
            >
                {isRedirecting ? <Spinner /> : <ShoppingCart size={18} />} {buttonText}
            </button>
        </div>
    );
};

export default ExamBundleCard;