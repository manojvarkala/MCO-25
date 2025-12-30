

import React, { FC, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { RecommendedBook } from '../types.ts';
import { BookUp, BookOpen } from 'lucide-react';
import BookshelfRenderer from './BookshelfRenderer.tsx'; // Import the new renderer

// Unified geo-affiliate link logic - NOW USES APP CONTEXT FOR IP-BASED GEO
const getGeoAffiliateLink = (book: RecommendedBook, userGeoCountryCode: string | null): { url: string; domainName: string; key: keyof RecommendedBook['affiliateLinks'] } | null => {
    if (!book.affiliateLinks) {
        return null;
    }
    const links = book.affiliateLinks;
    
    // Map country codes to Amazon keys
    const countryToAmazonKey: Record<string, keyof RecommendedBook['affiliateLinks']> = {
        'us': 'com', // United States
        'in': 'in',  // India
        'ae': 'ae',  // United Arab Emirates
        'gb': 'com', // United Kingdom
        'ca': 'com', // Canada
        'au': 'com', // Australia
        // Add more mappings as needed
    };
    const domainNames: Record<string, string> = { com: 'Amazon.com', in: 'Amazon.in', ae: 'Amazon.in' }; // Default to .in for AE
    if (links['ae'] && links['ae'].trim() !== '') {
        domainNames['ae'] = 'Amazon.ae';
    }


    let finalKey: keyof RecommendedBook['affiliateLinks'] | null = null;
    let finalDomainName: string | null = null;

    // 1. Prioritize IP-based country code if available and valid
    if (userGeoCountryCode && countryToAmazonKey[userGeoCountryCode.toLowerCase()]) {
        const preferredKey = countryToAmazonKey[userGeoCountryCode.toLowerCase()];
        if (links[preferredKey] && links[preferredKey].trim() !== '') {
            finalKey = preferredKey;
            finalDomainName = domainNames[preferredKey] || `Amazon.${preferredKey}`;
        }
    }

    // 2. Fallback to timezone-based inference if IP-based didn't yield a valid link
    if (!finalKey) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let preferredKeyFromTimezone: keyof RecommendedBook['affiliateLinks'] = 'com';
        
        const gccTimezones = [ 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Muscat' ];
        if (timeZone.includes('Asia/Kolkata') || timeZone.includes('Asia/Calcutta')) {
            preferredKeyFromTimezone = 'in';
        } else if (gccTimezones.some(tz => timeZone === tz)) {
            preferredKeyFromTimezone = 'ae';
        }

        if (links[preferredKeyFromTimezone] && links[preferredKeyFromTimezone].trim() !== '') {
            finalKey = preferredKeyFromTimezone;
            finalDomainName = domainNames[preferredKeyFromTimezone] || `Amazon.${preferredKeyFromTimezone}`;
        }
    }

    // 3. Final fallback: Use a default priority order if no specific match yet
    if (!finalKey) {
        const fallbackPriority: (keyof RecommendedBook['affiliateLinks'])[] = ['com', 'in', 'ae'];
        for (const key of fallbackPriority) {
            if (links[key] && links[key].trim() !== '') {
                finalKey = key;
                finalDomainName = domainNames[key] || `Amazon.${key}`;
                break;
            }
        }
    }

    if (finalKey && finalDomainName) {
        // Store the FINAL chosen key in localStorage for WordPress shortcodes to read via cookie
        try {
            localStorage.setItem('mco_preferred_geo_key', finalKey);
            localStorage.setItem('mco_user_geo_country_code', userGeoCountryCode || 'UNKNOWN'); // Also persist IP-based for debug
        } catch(e) {
            console.error("Failed to set geo preference in localStorage", e);
        }
        return { url: links[finalKey], domainName: finalDomainName, key: finalKey };
    }

    return null;
};

const decodeHtmlEntities = (html: string): string => {
    if (!html || typeof html !== 'string') return html || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return html;
    }
};

const SuggestedBooksSidebar: FC = () => {
    const { suggestedBooks } = useAppContext();
    
    // Memoize the random selection so it doesn't change on every render
    const randomBooks = useMemo(() => {
        if (!suggestedBooks || suggestedBooks.length === 0) {
            return [];
        }
        // Shuffle the array and take the first 5
        return [...suggestedBooks].sort(() => 0.5 - Math.random()).slice(0, 5);
    }, [suggestedBooks]);


    if (randomBooks.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <BookOpen className="mr-3 text-cyan-500" /> Study Hall
            </h3>
            <div className="space-y-6">
                <BookshelfRenderer books={randomBooks} type="sidebar" />
            </div>
             <p className="text-xs text-slate-400 mt-6 text-center">
                Using our affiliate links doesn't cost you extra and helps support our platform. Note: Book availability may vary by region. Thank you!
            </p>
        </div>
    );
};

export default SuggestedBooksSidebar;