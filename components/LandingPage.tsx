

import * as React from 'react';
// Fix: Use useNavigate from react-router-dom v6
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { LogIn, UserPlus } from 'lucide-react';
import LogoSpinner from './LogoSpinner.tsx';

const LandingPage: React.FC = () => {
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeOrg, isLoading } = useAppContext();
    
    React.useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const mainSiteBaseUrl = activeOrg ? `https://www.${activeOrg.website}` : '';
    const loginUrl = `${mainSiteBaseUrl}/exam-login/`;
    const registerUrl = `${mainSiteBaseUrl}/wp-login.php?action=register`;


    if (isLoading || !activeOrg || user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LogoSpinner />
                <p className="mt-4 text-slate-500">Loading Application...</p>
            </div>
        );
    }
    
    return (
        <div className="text-center py-20">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-4">Welcome to the Examination Portal</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
                Your central hub for {activeOrg.name} examinations. Please log in or register to access your dashboard and start your tests.
            </p>
            <div className="flex justify-center items-center gap-4">
                <a
                    href={registerUrl}
                    className="flex items-center justify-center bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-cyan-700 transition"
                    >
                    <UserPlus size={20} className="mr-2"/>
                    Register
                </a>
                <a
                    href={loginUrl}
                    className="flex items-center justify-center bg-slate-100 text-slate-700 font-bold py-3 px-8 rounded-lg text-lg hover:bg-slate-200 transition"
                >
                     <LogIn size={20} className="mr-2"/>
                    Login
                </a>
            </div>
        </div>
    );
};

export default LandingPage;