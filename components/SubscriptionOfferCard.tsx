import React, { FC } from 'react';

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

const SubscriptionOfferCard: FC<SubscriptionOfferCardProps> = ({ planName, price, priceUnit }) => {
    return (
        <div style={{ border: '2px dashed #ccc', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: 0, fontWeight: 'bold', color: 'rgb(var(--color-text-strong-rgb))' }}>{planName}</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'rgb(var(--color-text-strong-rgb))' }}>${price.toFixed(2)} / {priceUnit}</p>
            <p style={{ fontSize: '0.8rem', color: 'rgb(var(--color-text-muted-rgb))', marginTop: '1rem' }}>[Placeholder: Original component file was missing]</p>
        </div>
    );
};
export default SubscriptionOfferCard;