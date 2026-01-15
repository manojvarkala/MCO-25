import React, { FC, useState, useEffect, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

// Data for randomized social proof
const firstNames = [
    'John', 'Maria', 'David', 'Sarah', 'Michael', 'Jessica', 'Chris', 'Emily', 'Daniel', 'Laura',
    'Ahmed', 'Sophie', 'Liam', 'Olivia', 'James', 'Ava', 'Mohammed', 'Emma', 'Noah', 'Isabella',
    'William', 'Mia', 'Alexander', 'Charlotte', 'Henry', 'Amelia', 'Joseph', 'Harper', 'Thomas',
    'Evelyn', 'Ethan', 'Aria', 'Daniel', 'Scarlett', 'Benjamin', 'Grace', 'Lucas', 'Chloe',
    'Jackson', 'Lily', 'Samuel', 'Madison', 'Gabriel', 'Avery', 'Logan', 'Zoe', 'Matthew',
    'Abigail', 'Elijah', 'Natalie', 'Andrew', 'Hannah', 'Joshua', 'Julia', 'Ryan', 'Victoria',
    'Nathan', 'Sofia', 'Jacob', 'Ella', 'Christopher', 'Addison', 'Luke', 'Mila', 'Nicholas',
    'Brooklyn', 'Jonathan', 'Leah', 'Isaac', 'Audrey', 'Steven', 'Claire', 'Owen', 'Lila',
    'Caleb', 'Violet', 'Stella', 'Aaron', 'Layla', 'Kevin', 'Nora', 'Zachary', 'Hazel', 'Evan'
];

const locations = [
    'New York, NY', 'London, UK', 'Sydney, AU', 'Toronto, CA', 'Mumbai, IN', 'Los Angeles, CA', 'Chicago, IL', 'Dubai, AE',
    'Paris, FR', 'Tokyo, JP', 'Singapore, SG', 'Hong Kong, HK', 'Berlin, DE', 'Melbourne, AU', 'São Paulo, BR', 'Cape Town, ZA',
    'Bangkok, TH', 'Moscow, RU', 'Beijing, CN', 'Seoul, KR', 'Mexico City, MX', 'Istanbul, TR', 'Rome, IT', 'Amsterdam, NL',
    'Lagos, NG', 'Buenos Aires, AR', 'Cairo, EG', 'Shanghai, CN', 'Jakarta, ID', 'Kuala Lumpur, MY', 'Miami, FL', 'Vancouver, CA',
    'Stockholm, SE', 'Vienna, AT', 'Barcelona, ES', 'Delhi, IN', 'Rio de Janeiro, BR', 'Dublin, IE', 'San Francisco, CA', 'Oslo, NO',
    'Helsinki, FI', 'Santiago, CL', 'Bogotá, CO', 'Nairobi, KE', 'Manila, PH', 'Athens, GR', 'Lisbon, PT', 'Tel Aviv, IL',
    'Auckland, NZ', 'Prague, CZ', 'Zurich, CH', 'Montreal, CA', 'Houston, TX', 'Karachi, PK', 'Lima, PE', 'Kyiv, UA',
    'Johannesburg, ZA', 'Bangalore, IN', 'Hanoi, VN', 'Riyadh, SA', 'San Diego, CA', 'Brussels, BE', 'Budapest, HU', 'Warsaw, PL',
    'Munich, DE', 'Copenhagen, DK', 'Accra, GH', 'Colombo, LK', 'Doha, QA', 'Taipei, TW', 'San Jose, CR', 'Montevideo, UY',
    'Addis Ababa, ET', 'Algiers, DZ', 'Kolkata, IN', 'Guangzhou, CN', 'Casablanca, MA', 'Ankara, TR', 'Belfast, UK', 'Tunis, TN',
    'Seattle, WA'
];

const LivePurchaseNotification: FC = () => {
    const { isEffectivelyAdmin } = useAuth();
    const { activeOrg } = useAppContext();
    const [isVisible, setIsVisible] = useState(false);
    const [notification, setNotification] = useState({ name: '', location: '', exam: '', time: '' });
    
    const [adminPrefersHidden] = useState(() => {
        try {
            return localStorage.getItem('mco_show_notifications') === 'false';
        } catch {
            return false;
        }
    });

    // 1. Memoize filtered exams to prevent Effect re-runs
    const certificationExams = useMemo(() => {
        if (!activeOrg || !activeOrg.exams) return [];
        const exams = activeOrg.exams
            .filter(e => e && !e.isPractice && e.price > 0)
            .map(e => e.name);
        
        // Fallback if no paid exams are defined yet
        return exams.length > 0 ? exams : ['Professional Certification Exam'];
    }, [activeOrg]);

    // 2. Main Logic Effect
    useEffect(() => {
        // Global kill-switches
        if (!activeOrg || !activeOrg.purchaseNotifierEnabled) return;
        if (isEffectivelyAdmin && adminPrefersHidden) return;
        if (certificationExams.length === 0) return;

        let cycleTimeoutId: number;
        let hideTimeoutId: number;

        const minGap = (activeOrg.purchaseNotifierMinGap || 8) * 1000;
        const maxGap = (activeOrg.purchaseNotifierMaxGap || 23) * 1000;
        const visibilityDuration = 5000;

        const triggerNotification = () => {
            const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomLocation = locations[Math.floor(Math.random() * locations.length)];
            const randomExam = certificationExams[Math.floor(Math.random() * certificationExams.length)];
            const randomTime = `${Math.floor(Math.random() * 10) + 1} minutes ago`;

            setNotification({ 
                name: randomName, 
                location: randomLocation, 
                exam: randomExam, 
                time: randomTime 
            });
            
            setIsVisible(true);

            // Hide after visibilityDuration
            hideTimeoutId = window.setTimeout(() => {
                setIsVisible(false);
                
                // Schedule the NEXT one only AFTER this one is hidden
                const nextDelay = Math.floor(Math.random() * (maxGap - minGap)) + minGap;
                cycleTimeoutId = window.setTimeout(triggerNotification, nextDelay);
            }, visibilityDuration);
        };

        // Initial launch
        const initialDelay = (activeOrg.purchaseNotifierDelay || 7) * 1000;
        cycleTimeoutId = window.setTimeout(triggerNotification, initialDelay);

        return () => {
            window.clearTimeout(cycleTimeoutId);
            window.clearTimeout(hideTimeoutId);
        };
    }, [activeOrg, certificationExams, isEffectivelyAdmin, adminPrefersHidden]);

    // Early return if explicitly disabled
    if (!activeOrg || !activeOrg.purchaseNotifierEnabled) return null;
    if (isEffectivelyAdmin && adminPrefersHidden) return null;

    return (
        <div
            className={`fixed bottom-6 left-6 z-[60] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm transition-all duration-700 ease-in-out transform ${
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0'
            }`}
        >
            <div className="flex items-start">
                <div className="bg-emerald-100 p-3 rounded-xl mr-4 shadow-inner">
                    <ShoppingCart className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">
                        {notification.name} <span className="font-normal text-slate-500 text-xs uppercase tracking-tighter ml-1">from {notification.location}</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5 leading-tight">
                        Just purchased <span className="font-bold text-cyan-600">"{notification.exam}"</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{notification.time}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LivePurchaseNotification;