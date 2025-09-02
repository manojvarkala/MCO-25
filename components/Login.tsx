


import React, { FC, useEffect, useRef } from 'react';
// Fix: Use namespace import for react-router-dom to resolve module exports.
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import toast from 'react-hot-toast';

const Login: FC = () => {
    const location = ReactRouterDOM.useLocation();
    // Fix: Use useNavigate for v6 compatibility.
    const navigate = ReactRouterDOM.useNavigate();
    const { user, loginWithToken } = useAuth();
    const wasAlreadyLoggedIn = useRef(!!user);
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';

        // If a token is present, we must process it for login or sync.
        if (token) {
            loginWithToken(token)
                .then(() => {
                    if (wasAlreadyLoggedIn.current) {
                        toast.success('Exams synced successfully!');
                    } else {
                        toast.success('Logged in successfully!');
                    }
                    // Fix: Use navigate for v6 compatibility.
                    navigate(redirectTo, { replace: true });
                })
                .catch((e: any) => {
                    const errorMessage = e.message || 'Invalid login token. Please try again.';
                    toast.error(errorMessage);
                    // Fix: Use navigate for v6 compatibility.
                    navigate('/', { replace: true });
                });
        } 
        // If no token, but user is already logged in from a previous session.
        else if (user) {
            // Fix: Use navigate for v6 compatibility.
            navigate(redirectTo, { replace: true });
        } 
        // No token and no user, redirect to the landing page.
        else {
            // Fix: Use navigate for v6 compatibility.
            navigate('/', { replace: true });
        }
    }, [user, location.search, loginWithToken, navigate]);

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
