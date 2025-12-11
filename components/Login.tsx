import React, { FC, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';
import LogoSpinner from './LogoSpinner.tsx';
import { useAppContext } from '../context/AppContext.tsx';

const Login: FC = () => {
    const { loginWithToken, user } = useAuth();
    const { activeOrg, isInitializing } = useAppContext();
    const history = useHistory();
    const location = useLocation();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (isInitializing || hasProcessed.current) return;
        
        const mainSiteBaseUrl = activeOrg ? `https://${activeOrg.website}` : '';
        const loginUrl = mainSiteBaseUrl ? `${mainSiteBaseUrl}/exam-login/` : '/';

        hasProcessed.current = true;

        if (user) {
            history.replace('/dashboard');
            return;
        }

        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            const toastId = toast.loading('Authenticating your session...');
            loginWithToken(token)
                .then(() => {
                    toast.dismiss(toastId);
                    history.replace('/dashboard');
                })
                .catch((e) => {
                    toast.error(e.message || 'Authentication failed. Please try again.', { id: toastId });
                    window.location.href = loginUrl;
                });
        } else {
            toast.error('No authentication token found. Redirecting to login.');
            window.location.href = loginUrl;
        }
    }, [loginWithToken, history, location.search, user, activeOrg, isInitializing]);

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-slate-900">Authenticating...</h2>
                <LogoSpinner />
                <p className="text-slate-500">
                    Please wait while we securely log you in to the examination portal.
                </p>
            </div>
        </div>
    );
};

export default Login;