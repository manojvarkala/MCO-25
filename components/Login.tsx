import * as React from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const location = ReactRouterDOM.useLocation();
    const navigate = ReactRouterDOM.useNavigate();
    const { user, loginWithToken } = useAuth();
    const hasProcessed = React.useRef(false);

    React.useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';

        // Check if a user is already logged in to determine the context of the login action.
        const isSyncLogin = !!user;

        if (token) {
            loginWithToken(token, isSyncLogin)
                .then(() => {
                    // Toasts are now handled inside loginWithToken. Navigate on completion.
                    navigate(redirectTo, { replace: true });
                })
                .catch((e: any) => {
                    // This catch only handles critical token validation errors.
                    const errorMessage = e.message || 'Invalid login token. Please try again.';
                    toast.error(errorMessage);
                    navigate('/', { replace: true });
                });
        } 
        else if (user) {
            navigate(redirectTo, { replace: true });
        } 
        else {
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