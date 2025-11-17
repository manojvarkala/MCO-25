import React, { FC } from 'react';
import { Check, Star } from 'lucide-react';

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

const SubscriptionOfferCard: FC<SubscriptionOfferCardProps> = ({ planName, price, regularPrice, priceUnit, url, features, isBestValue = false, gradientClass }) => {
    return (
        <div className={`relative flex flex-col p-8 rounded-2xl text-white shadow-lg ${gradientClass}`}>
            {isBestValue && (
                <div className="absolute top-0 py-1.5 px-4 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold uppercase tracking-wide transform -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <Star className="inline-block h-4 w-4 mr-1"/> Best Value
                </div>
            )}
            <h3 className="text-2xl font-bold">{planName}</h3>
            
            <div className="mt-6">
                {regularPrice && regularPrice > price ? (
                    <>
                        <span className="text-2xl line-through opacity-70">${regularPrice.toFixed(2)}</span>
                        <span className="text-5xl font-extrabold ml-2">${price.toFixed(2)}</span>
                    </>
                ) : (
                    <span className="text-5xl font-extrabold">${price.toFixed(2)}</span>
                )}
                <span className="text-base font-medium opacity-80">/{priceUnit}</span>
            </div>

            {isBestValue && (
                <p className="mt-1 text-sm text-yellow-300 font-semibold">Saves over 35% compared to monthly!</p>
            )}

            <ul className="mt-6 space-y-4 flex-grow text-white/90">
                {features.map((feature, index) => (
                     <li key={index} className="flex items-start">
                        <Check className="flex-shrink-0 h-6 w-6 text-green-300" />
                        <span className="ml-3">{feature}</span>
                    </li>
                ))}
            </ul>

            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-8 block w-full bg-white border border-transparent rounded-md py-3 text-base font-semibold text-center hover:bg-opacity-90 transition"
                style={{ color: isBestValue ? '#5b21b6' : '#0e7490' }} // Purple-700 or Cyan-700
            >
                Subscribe Now
            </a>
        </div>
    );
};
export default SubscriptionOfferCard;