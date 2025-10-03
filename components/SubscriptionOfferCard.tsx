import React, { FC } from 'react';
import { Check, Star } from 'lucide-react';

interface SubscriptionOfferCardProps {
    planName: string;
    price: number;
    priceUnit: string;
    url: string;
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
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-auto block w-full bg-white text-slate-800 font-bold py-3 text-center rounded-lg hover:bg-slate-200 transition"
            >
                Subscribe Now
            </a>
        </div>
    );
};

export default SubscriptionOfferCard;
