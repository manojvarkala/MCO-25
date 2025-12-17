import React, { FC, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';
import LogoSpinner from './LogoSpinner.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { AlertTriangle, LogIn, RefreshCw, Trash2 } from 'lucide-react';

const Login: FC = () => {
    const { loginWithToken, user, logout } = useAuth();
    const { activeOrg, isInitializing } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();
    const hasProcessed = useRef(false);
    const [error, setError] = useState<string | null>(null);

    // Hard reset function: Clears EVERYTHING and redirects
    const handleHardReset = () => {
        localStorage.clear(); // Wipe all app data
        logout(); // Reset context state
        
        const mainSiteBaseUrl = activeOrg ? `https://${activeOrg.website}` : '';
        const cacheBuster = new Date().getTime();
        const loginUrl = mainSiteBaseUrl ? `${mainSiteBaseUrl}/exam-login/?v=${cacheBuster}` : '/';
        
        window.location.href = loginUrl;
    };

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
                    
                    // Cleanup URL
                    window.history.replaceState({}, document.title, window.location.pathname);

                    if (e.message === "Session Expired") {
                        // If just expired, auto-redirect to refresh it (seamless)
                        const cacheBuster = new Date().getTime();
                        window.location.href = `${mainSiteBaseUrl}/exam-login/?v=${cacheBuster}`;
                    } else {
                        // Real configuration error: show UI
                        setError(e.message || 'Authentication failed. Session invalid.');
                    }
                });
        } else {
            // No token, redirect to main login
            window.location.href = loginUrl;
        }
    }, [loginWithToken, navigate, location.search, user, activeOrg, isInitializing, logout]);

    if (error) {
        const isHeaderError = error.includes('Authorization');
        const isKeyError = error.includes('Security Key');

        return (
             <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="max-w-lg w-full space-y-6 bg-white p-8 rounded-xl shadow-lg text-center border border-red-100">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Login Issue Detected</h2>
                    
                    <div className="bg-red-50 p-4 rounded-lg text-left">
                        <p className="text-sm text-red-800 font-medium mb-1">Error Details:</p>
                        <p className="text-sm text-red-600 font-mono break-words">{error}</p>
                    </div>

                    <div className="text-slate-600 text-sm space-y-3 text-left">
                        <p>We encountered an issue verifying your session with the server.</p>
                        
                        {isHeaderError && (
                            <div className="bg-slate-100 p-3 rounded text-xs font-mono">
                                <strong>Admin Fix:</strong> Your server is stripping the <code>Authorization</code> header. Add the following to the top of your <code>.htaccess</code> file:
                                <br/><br/>
                                <code>RewriteRule .* - [E=HTTP_AUTHORIZATION:%&#123;HTTP:Authorization&#125;]</code>
                            </div>
                        )}
                        
                        {isKeyError && (
                            <div className="bg-slate-100 p-3 rounded text-xs font-mono">
                                <strong>Admin Fix:</strong> Ensure <code>MCO_JWT_SECRET</code> in <code>wp-config.php</code> is defined and matches the key used to generate this token.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={handleHardReset}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                        >
                            <Trash2 size={18} /> Clear Data & Retry Login
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        This button clears your local cache and forces a completely fresh login attempt.
                    </p>
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