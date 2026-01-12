
import React, { FC, useEffect, useRef, useState } from 'react';
// FIX: Standardized named imports from react-router-dom using single quotes.
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';
import LogoSpinner from './LogoSpinner.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { AlertTriangle, LogIn, RefreshCw, Trash2, Shield, Key, Server } from 'lucide-react'; // FIX: Added Server icon for consistency

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
        localStorage.removeItem('mco_dynamic_api_url'); // Explicitly clear dynamic API URL on hard reset
        localStorage.removeItem('activeOrgId'); // Also clear active org ID for a full reset
        
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
        // If the URL changes, force a full page reload to ensure apiConfig.ts re-evaluates.
        if (apiUrlOverride) {
            const currentStoredUrl = localStorage.getItem('mco_dynamic_api_url');
            if (currentStoredUrl !== apiUrlOverride) {
                console.log(`Binding app to new backend: ${apiUrlOverride}`);
                localStorage.setItem('mco_dynamic_api_url', apiUrlOverride);
                // Force a full reload to ensure apiConfig.ts is re-evaluated and the base URL is picked up.
                window.location.reload(); 
                return; // Stop further execution in this effect
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
                 if (activeOrg) {
                    window.location.href = loginUrl;
                 }
            }
        }
    }, [loginWithToken, location.search, user, isInitializing, mainSiteBaseUrl, activeOrg]); // Removed 'error' from dependencies

    if (error) {
        const isHeaderError = error.includes('Authorization');
        const isKeyError = error.includes('Security Key');
        const isLoopError = error.includes('Loop');
        const isConnectionBlocked = error.includes('Connection Blocked');


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
                            <div className="text-red-700">
                                <h4 className="font-bold text-red-800 mt-4 mb-2 flex items-center gap-2"><Shield size={16}/> Server Configuration Issue</h4>
                                <p className="mb-2">Your web server is likely stripping the <code>Authorization</code> header from requests. This is a common issue with Apache/LiteSpeed servers.</p>
                                <p className="mb-2"><strong>Fix:</strong> Add the following to the very top of your WordPress <code>.htaccess</code> file, BEFORE any other rules:</p>
                                <pre className="bg-red-100 p-2 rounded my-2 text-xs text-red-800 whitespace-pre-wrap font-mono"><code>
{`<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
</IfModule>`}
                                </code></pre>
                                <p className="mt-2 text-xs">After adding this, **clear all caches** (WordPress, server, CDN) and **re-save permalinks** in WordPress.</p>
                            </div>
                        )}
                        {isKeyError && (
                            <div className="text-red-700">
                                <h4 className="font-bold text-red-800 mt-4 mb-2 flex items-center gap-2"><Key size={16}/> Security Key Mismatch</h4>
                                <p className="mb-2">The security key (<code>MCO_JWT_SECRET</code>) in your browser's token does not match the one defined in your WordPress <code>wp-config.php</code> file.</p>
                                <p className="mb-2"><strong>Fix:</strong> Ensure the <code>MCO_JWT_SECRET</code> in your <code>wp-config.php</code> is identical to the one your WordPress site is using to generate tokens. If you recently changed it, this error is expected until new tokens are generated with the new key.</p>
                                <p className="mt-2 text-xs">After fixing, click "Hard Reset & Retry Login".</p>
                            </div>
                        )}
                        {isConnectionBlocked && (
                            <div className="text-red-700">
                                <h4 className="font-bold text-red-800 mt-4 mb-2 flex items-center gap-2"><Server size={16}/> API Connection Blocked</h4>
                                <p className="mb-2">The browser could not reach the backend API endpoint. This is a critical server-side issue.</p>
                                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                    <li><strong>PHP Fatal Error:</strong> Check your WordPress <code>wp-content/debug.log</code> file for any PHP fatal errors. A fatal error will completely stop the API from responding.</li>
                                    <li><strong>WordPress Permalinks:</strong> Go to WordPress Admin &gt; Settings &gt; Permalinks and simply click "Save Changes" to flush rewrite rules.</li>
                                    <li><strong>API URL Config:</strong> In WordPress Admin &gt; Exam App Engine &gt; Main Settings, ensure the "App URL(s)" matches the URL you are viewing this app on (e.g., <code>https://exams.yourdomain.com</code>).</li>
                                    <li><strong>CORS:</strong> If your frontend (e.g., <code>app.domain.com</code>) is different from your backend (e.g., <code>api.domain.com</code>), ensure your CORS settings are correct in WordPress Admin &gt; Exam App Engine &gt; Main Settings (App URL(s) field).</li>
                                </ul>
                                <p className="mt-2 text-xs">After checking, click "Hard Reset & Retry Login".</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={handleHardReset}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                        >
                            <Trash2 size={18} /> Hard Reset & Retry Login
                        </button>
                    </div>
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
