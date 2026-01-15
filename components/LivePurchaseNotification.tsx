import React, { FC, useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

type RegionProfile = {
    countryCode: string;
    names: string[];
    locations: string[];
};

const REGION_PROFILES: RegionProfile[] = [

    /* ------------------------------------------------------------------ */
    /* India                                                              */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'IN',
        names: [
            'Amit', 'Rahul', 'Vikram', 'Arjun', 'Sandeep',
            'Priya', 'Ananya', 'Neha', 'Pooja', 'Sneha'
        ],
        locations: [
            'Mumbai, IN', 'Delhi, IN', 'Bangalore, IN',
            'Chennai, IN', 'Hyderabad, IN', 'Kolkata, IN'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* United Arab Emirates / Gulf                                         */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'AE',
        names: [
            'Ahmed', 'Mohammed', 'Omar', 'Yousef', 'Hassan',
            'Aisha', 'Fatima', 'Mariam', 'Noor'
        ],
        locations: [
            'Dubai, AE', 'Abu Dhabi, AE', 'Sharjah, AE',
            'Ajman, AE', 'Al Ain, AE'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Saudi Arabia                                                        */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'SA',
        names: [
            'Abdullah', 'Faisal', 'Khalid', 'Nasser',
            'Sara', 'Reem', 'Lina', 'Huda'
        ],
        locations: [
            'Riyadh, SA', 'Jeddah, SA', 'Dammam, SA'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* United States                                                       */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'US',
        names: [
            'John', 'Michael', 'Daniel', 'Christopher',
            'Emily', 'Sarah', 'Jessica', 'Olivia', 'Emma'
        ],
        locations: [
            'New York, NY', 'Los Angeles, CA', 'Chicago, IL',
            'San Francisco, CA', 'Austin, TX', 'Seattle, WA'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* United Kingdom                                                      */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'UK',
        names: [
            'James', 'Oliver', 'William', 'Henry',
            'Charlotte', 'Amelia', 'Isla', 'Sophia'
        ],
        locations: [
            'London, UK', 'Manchester, UK',
            'Birmingham, UK', 'Leeds, UK'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Western Europe (France, Germany, Netherlands)                       */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'EU-W',
        names: [
            'Pierre', 'Julien', 'Lucas', 'Matthias',
            'Marie', 'Sophie', 'Anna', 'Laura'
        ],
        locations: [
            'Paris, FR', 'Berlin, DE', 'Munich, DE',
            'Amsterdam, NL', 'Brussels, BE'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Southern Europe (Italy, Spain, Portugal)                            */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'EU-S',
        names: [
            'Luca', 'Marco', 'Alessandro', 'Carlos',
            'Sofia', 'Elena', 'Giulia', 'Maria'
        ],
        locations: [
            'Rome, IT', 'Milan, IT', 'Barcelona, ES',
            'Madrid, ES', 'Lisbon, PT'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Southeast Asia                                                      */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'SEA',
        names: [
            'Arif', 'Rizky', 'Aditya', 'Budi',
            'Siti', 'Putri', 'Ayu', 'Nur'
        ],
        locations: [
            'Jakarta, ID', 'Kuala Lumpur, MY',
            'Singapore, SG', 'Manila, PH'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* East Asia                                                           */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'EA',
        names: [
            'Wei', 'Liang', 'Chen', 'Zhang',
            'Mei', 'Xia', 'Lin', 'Hui'
        ],
        locations: [
            'Shanghai, CN', 'Beijing, CN',
            'Hong Kong, HK', 'Taipei, TW'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Africa                                                              */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'AF',
        names: [
            'Kwame', 'Kofi', 'Samuel', 'Daniel',
            'Amina', 'Zainab', 'Fatou', 'Grace'
        ],
        locations: [
            'Lagos, NG', 'Accra, GH',
            'Nairobi, KE', 'Johannesburg, ZA'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Australia & New Zealand                                             */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'AU',
        names: [
            'Liam', 'Jack', 'Noah', 'Ethan',
            'Olivia', 'Chloe', 'Isabella', 'Mia'
        ],
        locations: [
            'Sydney, AU', 'Melbourne, AU',
            'Brisbane, AU', 'Auckland, NZ'
        ]
    },

    /* ------------------------------------------------------------------ */
    /* Canada                                                              */
    /* ------------------------------------------------------------------ */
    {
        countryCode: 'CA',
        names: [
            'Matthew', 'Ryan', 'Daniel', 'Lucas',
            'Emily', 'Hannah', 'Lauren', 'Ava'
        ],
        locations: [
            'Toronto, CA', 'Vancouver, CA',
            'Montreal, CA', 'Calgary, CA'
        ]
    }
];

const LivePurchaseNotification: FC = () => {
    const { activeOrg, purchaseNotifierEnabled, purchaseNotifierDelay, purchaseNotifierMinGap, purchaseNotifierMaxGap } = useAppContext();
    const [isVisible, setIsVisible] = useState(false);
    const [currentData, setCurrentData] = useState({
        name: '',
        location: '',
        exam: '',
        time: ''
    });

    const examPool = useMemo(() => {
        return activeOrg?.exams.filter(e => !e.isPractice).map(e => e.name) || ['Certification Exam'];
    }, [activeOrg]);

    useEffect(() => {
        if (!purchaseNotifierEnabled) return;

        let timeout: number;

        const showNotification = () => {
            // 1. Pick a random cultural region
            const region = regionProfiles[Math.floor(Math.random() * regionProfiles.length)];
            
            // 2. Pick paired data from that region
            const randomName = region.names[Math.floor(Math.random() * region.names.length)];
            const randomLocation = region.locations[Math.floor(Math.random() * region.locations.length)];
            
            // 3. Pick random exam and timestamp
            const randomExam = examPool[Math.floor(Math.random() * examPool.length)];
            const randomMinutes = Math.floor(Math.random() * 12) + 1;

            setCurrentData({
                name: randomName,
                location: randomLocation,
                exam: randomExam,
                time: `${randomMinutes} minutes ago`
            });

            setIsVisible(true);

            // Hide after 6 seconds
            setTimeout(() => setIsVisible(false), 6000);

            // Schedule next notification based on organization gaps
            const min = (purchaseNotifierMinGap || 8) * 1000;
            const max = (purchaseNotifierMaxGap || 23) * 1000;
            const nextDelay = Math.floor(Math.random() * (max - min + 1)) + min;
            timeout = window.setTimeout(showNotification, nextDelay);
        };

        // Initial launch delay
        timeout = window.setTimeout(showNotification, (purchaseNotifierDelay || 7) * 1000);

        return () => window.clearTimeout(timeout);
    }, [purchaseNotifierEnabled, examPool, purchaseNotifierDelay, purchaseNotifierMinGap, purchaseNotifierMaxGap]);

    if (!purchaseNotifierEnabled || !isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[60] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex items-center gap-4 max-w-sm">
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 flex-shrink-0">
                    <ShoppingCart size={24} />
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-900 truncate">
                        {currentData.name} from {currentData.location}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                        Just purchased the <span className="font-bold text-cyan-600">"{currentData.exam}"</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <Clock size={10} />
                        <span>{currentData.time}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LivePurchaseNotification;