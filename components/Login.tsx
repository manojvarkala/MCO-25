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

    const mainSiteBaseUrl = activeOrg ? `https://${activeOrg.website}` : '';

    // Hard reset function: Clears EVERYTHING and redirects
    const handleHardReset = () => {
        localStorage.clear(); 
        sessionStorage.clear(); 
        logout(); 
        
        const cacheBuster = new Date().getTime();
        const loginUrl = mainSiteBaseUrl ? `${mainSiteBaseUrl}/exam-login/?v=${cacheBuster}` : '/';
        
        window.location.href = loginUrl;
    };

    // Effect 1: Immediate redirection if user is already authenticated
    useEffect(() => {
        if (user && !isInitializing) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, isInitializing, navigate]);

    // Effect 2: Handle token and API URL binding
    useEffect(() => {
        if (isInitializing) return;
        if (user) return;
        if (hasProcessed.current) return;

        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const apiUrlOverride = params.get('api_url');
        
        // DYNAMIC BINDING (CRITICAL FIX): 
        // Always enforce the API URL from the redirect if present.
        // This ensures subsequent calls go to the correct backend before the token is used.
        if (apiUrlOverride) {
            const currentStoredUrl = localStorage.getItem('mco_dynamic_api_url');
            if (currentStoredUrl !== apiUrlOverride) {
                console.log(`Binding app to new backend: ${apiUrlOverride}`);
                localStorage.setItem('mco_dynamic_api_url', apiUrlOverride);
                // We don't reload here because getApiBaseUrl() reads from localStorage directly.
                // The subsequent loginWithToken -> syncResults flow will use the new URL.
            }
        }

        const loginUrl = mainSiteBaseUrl ? `${mainSiteBaseUrl}/exam-login/` : '/';

        if (token) {
            hasProcessed.current = true;
            const toastId = toast.loading('Authenticating your session...');
            
            loginWithToken(token)
                .then(() => {
                    toast.dismiss(toastId);
                    sessionStorage.removeItem('auth_retry_count');
                    // Navigation handled by Effect 1
                })
                .catch((e) => {
                    console.error("Login failed:", e);
                    toast.dismiss(toastId);
                    
                    // Cleanup URL
                    window.history.replaceState({}, document.title, window.location.pathname);

                    if (e.message === "Session Expired") {
                        const retryCount = parseInt(sessionStorage.getItem('auth_retry_count') || '0', 10);
                        if (retryCount < 3) {
                            sessionStorage.setItem('auth_retry_count', (retryCount + 1).toString());
                            const cacheBuster = new Date().getTime();
                            console.log(`Token expired. Retrying (Attempt ${retryCount + 1}/3)...`);
                            window.location.href = `${loginUrl}?v=${cacheBuster}`;
                        } else {
                            sessionStorage.removeItem('auth_retry_count');
                            setError("Login Loop Detected: Your browser is caching an old, expired login token. Please click 'Hard Reset' below.");
                        }
                    } else {
                        setError(e.message || 'Authentication failed. Session invalid.');
                    }
                });
        } else {
            if (!error) {
                 // If no token and no error, redirect to login.
                 // Ideally we should wait for activeOrg to be loaded to know where to redirect.
                 if (activeOrg) {
                    window.location.href = loginUrl;
                 }
            }
        }
    }, [loginWithToken, location.search, user, isInitializing, mainSiteBaseUrl, error, activeOrg]);

    if (error) {
        const isHeaderError = error.includes('Authorization');
        const isKeyError = error.includes('Security Key');
        const isLoopError = error.includes('Loop');

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
                        
                        {isLoopError && (
                             <p><strong>Diagnosis:</strong> Your WordPress site is serving a cached page with an old security token. The "Hard Reset" below forces a fresh request.</p>
                        )}
                        
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
                            <Trash2 size={18} /> Hard Reset & Retry Login
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        This button clears local storage, session cache, and forces a completely fresh login attempt.
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
                <button 
                    onClick={handleHardReset}
                    className="text-xs text-slate-400 underline hover:text-slate-600 mt-8"
                >
                    Stuck? Click here to reset.
                </button>
            </div>
        </div>
    );
};

export default Login;