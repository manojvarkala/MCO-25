import React, { FC, useState, useEffect, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

/* -------------------------------------------------------------------------- */
/* Region-aware social identity generator                                      */
/* -------------------------------------------------------------------------- */

type RegionProfile = {
    countryCode: string;
    names: string[];
    locations: string[];
};

const REGION_PROFILES: RegionProfile[] = [
    {
        countryCode: 'IN',
        names: ['Amit', 'Rahul', 'Vikram', 'Arjun', 'Priya', 'Ananya', 'Neha'],
        locations: ['Mumbai, IN', 'Delhi, IN', 'Bangalore, IN', 'Chennai, IN']
    },
    {
        countryCode: 'AE',
        names: ['Ahmed', 'Mohammed', 'Omar', 'Aisha', 'Fatima', 'Noor'],
        locations: ['Dubai, AE', 'Abu Dhabi, AE', 'Sharjah, AE']
    },
    {
        countryCode: 'US',
        names: ['John', 'Michael', 'Daniel', 'Sarah', 'Emily', 'Jessica'],
        locations: ['New York, NY', 'Los Angeles, CA', 'Chicago, IL']
    },
    {
        countryCode: 'UK',
        names: ['James', 'Oliver', 'Charlotte', 'Amelia', 'Henry'],
        locations: ['London, UK', 'Manchester, UK']
    }
];

const getRandomSocialIdentity = (preferredCountry?: string) => {
    const pool = preferredCountry
        ? REGION_PROFILES.filter(r => r.countryCode === preferredCountry)
        : REGION_PROFILES;

    const region =
        pool.length > 0
            ? pool[Math.floor(Math.random() * pool.length)]
            : REGION_PROFILES[Math.floor(Math.random() * REGION_PROFILES.length)];

    return {
        name: region.names[Math.floor(Math.random() * region.names.length)],
        location: region.locations[Math.floor(Math.random() * region.locations.length)]
    };
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

const LivePurchaseNotification: FC = () => {
    const { isEffectivelyAdmin } = useAuth();
    const { activeOrg } = useAppContext();

    const [isVisible, setIsVisible] = useState(false);
    const [notification, setNotification] = useState({
        name: '',
        location: '',
        exam: '',
        time: ''
    });

    const [adminPrefersHidden] = useState(() => {
        try {
            return localStorage.getItem('mco_show_notifications') === 'false';
        } catch {
            return false;
        }
    });

    const certificationExams = useMemo(() => {
        if (!activeOrg?.exams) return [];
        const exams = activeOrg.exams
            .filter(e => e && !e.isPractice && e.price > 0)
            .map(e => e.name);

        return exams.length ? exams : ['Professional Certification Exam'];
    }, [activeOrg]);

    useEffect(() => {
        if (!activeOrg?.purchaseNotifierEnabled) return;
        if (isEffectivelyAdmin && adminPrefersHidden) return;
        if (certificationExams.length === 0) return;

        let cycleTimeoutId: number;
        let hideTimeoutId: number;

        const minGap = (activeOrg.purchaseNotifierMinGap || 8) * 1000;
        const maxGap = (activeOrg.purchaseNotifierMaxGap || 23) * 1000;
        const visibilityDuration = 5000;

        const triggerNotification = () => {
            const { name, location } = getRandomSocialIdentity(activeOrg.countryCode);

            const exam =
                certificationExams[Math.floor(Math.random() * certificationExams.length)];
            const time = `${Math.floor(Math.random() * 10) + 1} minutes ago`;

            setNotification({ name, location, exam, time });
            setIsVisible(true);

            hideTimeoutId = window.setTimeout(() => {
                setIsVisible(false);

                const nextDelay =
                    Math.floor(Math.random() * (maxGap - minGap)) + minGap;
                cycleTimeoutId = window.setTimeout(triggerNotification, nextDelay);
            }, visibilityDuration);
        };

        cycleTimeoutId = window.setTimeout(
            triggerNotification,
            (activeOrg.purchaseNotifierDelay || 7) * 1000
        );

        return () => {
            window.clearTimeout(cycleTimeoutId);
            window.clearTimeout(hideTimeoutId);
        };
    }, [activeOrg, certificationExams, isEffectivelyAdmin, adminPrefersHidden]);

    if (!activeOrg?.purchaseNotifierEnabled) return null;
    if (isEffectivelyAdmin && adminPrefersHidden) return null;

    return (
        <div
            className={`fixed bottom-6 left-6 z-[60] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm transition-all duration-700 ease-in-out transform ${
                isVisible
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-[120%] opacity-0'
            }`}
        >
            <div className="flex items-start">
                <div className="bg-emerald-100 p-3 rounded-xl mr-4 shadow-inner">
                    <ShoppingCart className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">
                        {notification.name}
                        <span className="font-normal text-slate-500 text-xs uppercase ml-1">
                            from {notification.location}
                        </span>
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">
                        Just purchased{' '}
                        <span className="font-bold text-cyan-600">
                            “{notification.exam}”
                        </span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {notification.time}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LivePurchaseNotification;
