import React, { useEffect, useState, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const location = ReactRouterDOM.useLocation();
    const navigate = ReactRouterDOM.useNavigate();
    const { user, loginWithToken } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const wasAlreadyLoggedIn = useRef(!!user);
    const tokenProcessed = useRef(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');

        const handleLogin = async () => {
            if (token && !tokenProcessed.current) {
                tokenProcessed.current = true; 
                try {
                    await loginWithToken(token);
                    setIsLoading(false);
                } catch (e: any) {
                    const errorMessage = e.message || 'Invalid login token. Please try again.';
                    toast.error(errorMessage);
                    setIsLoading(false);
                    navigate('/', { replace: true });
                }
            } else {
                setIsLoading(false);
            }
        };

        handleLogin();
    }, [location.search, loginWithToken, navigate]);

    if (isLoading && !user) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-slate-900">Finalizing Login</h2>
                    <LogoSpinner />
                    <p className="text-slate-500">Please wait while we securely log you in...</p>
                </div>
            </div>
        );
    }
    
    if (user) {
        const searchParams = new URLSearchParams(location.search);
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';
        
        if (tokenProcessed.current) {
             if (wasAlreadyLoggedIn.current) {
                toast.success('Exams synced successfully!');
             } else {
                toast.success('Logged in successfully!');
             }
        }
        
        return <ReactRouterDOM.Navigate to={redirectTo} replace />;
    }

    if (!isLoading && !user) {
        return <ReactRouterDOM.Navigate to="/" replace />;
    }

    return null;
};

export default Login;