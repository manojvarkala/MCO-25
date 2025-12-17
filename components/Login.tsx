import React, { FC, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';
import LogoSpinner from './LogoSpinner.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { AlertTriangle, LogIn } from 'lucide-react';

const Login: FC = () => {
    const { loginWithToken, user } = useAuth();
    const { activeOrg, isInitializing } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();
    const hasProcessed = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isInitializing || hasProcessed.current) return;
        
        const mainSiteBaseUrl = activeOrg ? `https://${activeOrg.website}` : '';
        const loginUrl = mainSiteBaseUrl ? `${mainSiteBaseUrl}/exam-login/` : '/';

        hasProcessed.current = true;

        if (user) {
            navigate('/dashboard', { replace: true });
            return;
        }

        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            const toastId = toast.loading('Authenticating your session...');
            loginWithToken(token)
                .then(() => {
                    toast.dismiss(toastId);
                    navigate('/dashboard', { replace: true });
                })
                .catch((e) => {
                    console.error("Login failed:", e);
                    toast.dismiss(toastId);
                    // STOP THE LOOP: Do not redirect automatically on failure.
                    // Show the error so the user (and admin) knows what is wrong.
                    setError(e.message || 'Authentication failed. Session invalid.');
                });
        } else {
            // If no token is present, we can safely redirect to the main login page.
            window.location.href = loginUrl;
        }
    }, [loginWithToken, navigate, location.search, user, activeOrg, isInitializing]);

    if (error) {
        const mainSiteBaseUrl = activeOrg ? `https://${activeOrg.website}` : '';
        const loginUrl = mainSiteBaseUrl ? `${mainSiteBaseUrl}/exam-login/` : '/';

        return (
             <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg text-center border border-red-100">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Login Failed</h2>
                    <div className="bg-red-50 p-4 rounded-lg text-left">
                        <p className="text-sm text-red-800 font-medium mb-1">Server Response:</p>
                        <p className="text-sm text-red-600 font-mono break-all">{error}</p>
                    </div>
                    <div className="text-slate-500 text-sm space-y-2">
                        <p>This usually occurs due to a configuration mismatch on the server.</p>
                        <p><strong>Admin Note:</strong> Ensure <code>MCO_JWT_SECRET</code> in <code>wp-config.php</code> matches the plugin version.</p>
                    </div>
                    <a 
                        href={loginUrl}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition"
                    >
                        <LogIn size={18} /> Try Logging In Again
                    </a>
                </div>
            </div>
        );
    }

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