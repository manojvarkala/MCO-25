import React, { FC, useRef, useEffect } from 'react';
// FIX: Refactored to use react-router-dom v6 to resolve module export errors.
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import toast from 'react-hot-toast';

const Login: FC = () => {
    const location = useLocation();
    // FIX: Replaced useHistory with useNavigate for v6 compatibility.
    const navigate = useNavigate();
    const { loginWithToken, user } = useAuth();
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
                .then(() => {
                    // After all auth state is set and sync is done, navigate.
                    // This imperative navigation fixes a race condition on login.
                    navigate('/dashboard', { replace: true });
                })
                .catch((e: any) => {
                    // This catch handles critical token validation errors from AuthContext.
                    const errorMessage = e.message || 'Invalid login token. Please try again.';
                    toast.error(errorMessage);
                    navigate('/', { replace: true });
                });
        } else {
            // If there's no token but the user is already logged in, redirect them.
            // Otherwise, send them to the landing page.
            if (user) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }, [location.search, loginWithToken, navigate, user]);

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
