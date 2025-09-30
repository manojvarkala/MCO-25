import React, { FC } from 'react';

const Seal: FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <svg
            className={className}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#fde047', stopOpacity: 1 }} /> 
                    <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <g>
                <path
                    d="M50 0 L55 35 L70 15 L65 40 L90 30 L75 45 L100 50 L75 55 L90 70 L65 60 L70 85 L55 65 L50 100 L45 65 L30 85 L35 60 L10 70 L25 55 L0 50 L25 45 L10 30 L35 40 L30 15 L45 35 Z"
                    fill="url(#goldGradient)"
                />
                <circle cx="50" cy="50" r="25" fill="#fefce8" />
                <path
                    d="M40 50 l5 5 l10 -10"
                    stroke="#ca8a04"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
};

export default Seal;
