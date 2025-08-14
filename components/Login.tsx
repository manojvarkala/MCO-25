import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import Spinner from './Spinner.tsx';
import toast from 'react-hot-toast';

// This component handles the auth callback from the external site.
const Login: React.FC = () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const { user, loginWithToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const wasAlreadyLoggedIn = useRef(!!user);
    const tokenProcessed = useRef(false);

    useEffect(() => {
        const token = searchParams.get('token');
        
        // Process a token only if it exists and hasn't been processed yet in this component lifecycle.
        if (token && !tokenProcessed.current) {
            try {
                loginWithToken(token);
                tokenProcessed.current = true; // Mark as processed to prevent re-processing on re-renders
            } catch (e: any) {
                const errorMessage = e.message || 'Invalid login token. Please try again.';
                toast.error(errorMessage);
                setError(errorMessage);
            }
        } else if (!token && !user) {
            // Handle case where user navigates here without a token and is not logged in.
            const errorMessage = 'Login token not found.';
            toast.error(errorMessage);
            setError(errorMessage);
        }

    }, [searchParams, loginWithToken, user]);

    // If there was an error during token processing, redirect to the home page.
    if (error) {
        return <Navigate to="/" replace />;
    }

    // Once the user object is available in the context (either from token or session), redirect.
    if (user) {
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';
        
        // This check ensures the toast only appears once after the token is processed.
        if (tokenProcessed.current) {
             if (wasAlreadyLoggedIn.current) {
                toast.success('Exams synced successfully!');
             } else {
                toast.success('Logged in successfully!');
             }
        }
        
        return <Navigate to={redirectTo} replace />;
    }

    // While waiting for the token to be processed and user state to update, show a spinner.
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-slate-900">Finalizing Login</h2>
                <Spinner />
                <p className="text-slate-500">Please wait while we securely log you in...</p>
            </div>
        </div>
    );
};

export default Login;