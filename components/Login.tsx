import React, { FC, useRef, useEffect } from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import toast from 'react-hot-toast';

const Login: FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { loginWithToken } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        // This effect should only run once when the component mounts.
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');

        if (token) {
            // A user is attempting to log in with a token.
            // We check localStorage to see if they were already logged in, which indicates a sync vs a fresh login.
            const isSyncLogin = !!localStorage.getItem('examUser');

            loginWithToken(token, isSyncLogin)
                .catch((e: any) => {
                    // This catch handles critical token validation errors from AuthContext.
                    const errorMessage = e.message || 'Invalid login token. Please try again.';
                    toast.error(errorMessage);
                    navigate('/', { replace: true });
                });
        } else {
            // No token found in the URL. This page shouldn't be accessed directly.
            // Redirect to the landing page. The LandingPage component will handle
            // redirecting to the dashboard if a user is already logged in.
            navigate('/', { replace: true });
        }
        // The navigation logic is now handled reactively by the App component,
        // so this component's only job is to start the login process.
    }, [location.search, loginWithToken, navigate]);

    // This component's primary job is to process and redirect.
    // It will show a loading screen for the brief moment it's mounted.
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-slate-900">Finalizing Login</h2>
                <LogoSpinner />
                <p className="text-slate-500">Please wait while we securely process your request...</p>
            </div>
        </div>
    );
};

export default Login;