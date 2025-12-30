

import React, { FC } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import type { RecommendedBook } from '../types.ts';
import { ShoppingCart, BookOpenCheck } from 'lucide-react';
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

const BookStore: FC = () => {
    const { suggestedBooks, isInitializing } = useAppContext();

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-[rgb(var(--color-text-muted-rgb))]">Loading Books...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-[rgb(var(--color-card-rgb))] p-8 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="text-center mb-12">
                     <BookOpenCheck className="mx-auto h-12 w-12 text-[rgb(var(--color-primary-rgb))]" />
                     <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] mt-4">Recommended Study Materials</h1>
                    <p className="mt-4 text-lg text-[rgb(var(--color-text-default-rgb))] max-w-3xl mx-auto">
                        Enhance your learning with our curated list of essential books for medical coding professionals. Each book has been selected to help you succeed in your exams and career.
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-muted-rgb))] mt-4">
                        As an Amazon Associate, we earn from qualifying purchases. Using our links doesn't cost you extra and helps support our platform to keep creating great content for you. Please note that book availability may vary by region.
                    </p>
                </div>

                {suggestedBooks.length > 0 ? (
                    <div className="mco-book-grid">
                        <BookshelfRenderer books={suggestedBooks} type="showcase" />
                    </div>
                ) : (
                    <p className="text-center text-[rgb(var(--color-text-muted-rgb))]">No books are currently recommended.</p>
                )}
            </div>
        </div>
    );
};

export default BookStore;