import React, { FC, useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

// Data for fake notifications
const firstNames = ['John', 'Maria', 'David', 'Sarah', 'Michael', 'Jessica', 'Chris', 'Emily', 'Daniel', 'Laura',
  'Ahmed', 'Sophie', 'Liam', 'Olivia', 'James', 'Ava', 'Mohammed', 'Emma', 'Noah', 'Isabella',
  'William', 'Mia', 'Alexander', 'Charlotte', 'Henry', 'Amelia', 'Joseph', 'Harper', 'Thomas',
  'Evelyn', 'Ethan', 'Aria', 'Daniel', 'Scarlett', 'Benjamin', 'Grace', 'Lucas', 'Chloe',
  'Jackson', 'Lily', 'Samuel', 'Madison', 'Gabriel', 'Avery', 'Logan', 'Zoe', 'Matthew',
  'Abigail', 'Elijah', 'Natalie', 'Andrew', 'Hannah', 'Joshua', 'Julia', 'Ryan', 'Victoria',
  'Nathan', 'Sofia', 'Jacob', 'Ella', 'Christopher', 'Addison', 'Luke', 'Mila', 'Nicholas',
  'Brooklyn', 'Jonathan', 'Leah', 'Isaac', 'Audrey', 'Steven', 'Claire', 'Owen', 'Lila',
  'Caleb', 'Violet', 'Stella', 'Aaron', 'Layla', 'Kevin', 'Nora', 'Zachary', 'Hazel', 'Evan'];
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
    
    // The entire notifier is disabled from the backend.
    if (!activeOrg || !activeOrg.purchaseNotifierEnabled) {
        return null;
    }

    const [adminPrefersHidden, setAdminPrefersHidden] = useState(() => {
        try {
            return localStorage.getItem('mco_show_notifications') === 'false';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mco_show_notifications') {
                setAdminPrefersHidden(e.newValue === 'false');
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);


    if (isEffectivelyAdmin && adminPrefersHidden) {
        return null; // Don't render for admins who have opted out.
    }

    const certificationExams = activeOrg?.exams.filter(e => !e.isPractice && e.price > 0).map(e => e.name) || [];

    useEffect(() => {
        if (!activeOrg || certificationExams.length === 0) {
            return;
        }

        let timeoutId: number | undefined;

        const showRandomNotification = () => {
            const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomLocation = locations[Math.floor(Math.random() * locations.length)];
            const randomExam = certificationExams[Math.floor(Math.random() * certificationExams.length)];
            const randomTime = `${Math.floor(Math.random() * 10) + 1} minutes ago`;

            setNotification({ name: randomName, location: randomLocation, exam: randomExam, time: randomTime });
            setIsVisible(true);

            // Hide after 5 seconds
            window.setTimeout(() => {
                setIsVisible(false);
            }, 5000);

            // Schedule next notification
            const randomDelay = Math.random() * 15000 + 8000; // 8 to 23 seconds
            timeoutId = window.setTimeout(showRandomNotification, randomDelay + 5000); // add 5s for hide animation duration
        };

        const initialDelay = (activeOrg.purchaseNotifierDelay || 7) * 1000;

        // Start the loop after an initial delay
        timeoutId = window.setTimeout(showRandomNotification, initialDelay);

        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [activeOrg, certificationExams]);

    return (
        <div
            className={`fixed bottom-4 left-4 z-50 bg-white p-4 rounded-lg shadow-2xl border border-slate-200 w-full max-w-sm transition-all duration-500 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        >
            <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-full mr-4">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-slate-800">
                        {notification.name} from {notification.location}
                    </p>
                    <p className="text-sm text-slate-600">
                        Just purchased the "{notification.exam}"
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                </div>
            </div>
        </div>
    );
};

export default LivePurchaseNotification;