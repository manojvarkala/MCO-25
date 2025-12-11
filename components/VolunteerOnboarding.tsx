import React, { FC, useRef, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import LogoSpinner from './LogoSpinner.tsx';
import toast from 'react-hot-toast';

const VolunteerOnboarding: FC = () => {
    const { token } = useParams<{ token: string }>();
    const history = useHistory();
    const { loginWithToken, user } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        if (user) {
            toast("You are already logged in.", { icon: '👋' });
            history.replace('/dashboard');
            return;
        }

        if (token) {
            const toastId = toast.loading('Redeeming your beta access token...');
            googleSheetsService.redeemTesterToken(token)
                .then(response => {
                    const jwtToken = response.token;
                    if (!jwtToken) {
                        throw new Error("Server did not return an authentication token.");
                    }
                    // The second argument 'false' indicates this is a fresh login, not a sync.
                    return loginWithToken(jwtToken, false);
                })
                .then(() => {
                    toast.success('Welcome, Beta Tester! Your premium access has been activated.', { id: toastId, duration: 6000 });
                    history.replace('/dashboard');
                })
                .catch((e: any) => {
                    const errorMessage = e.message || 'Invalid or expired tester token. Please check your link.';
                    toast.error(errorMessage, { id: toastId });
                    history.replace('/');
                });
        } else {
            toast.error("No tester token provided.");
            history.replace('/');
        }
    }, [token, loginWithToken, history, user]);

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-slate-900">Activating Beta Access</h2>
                <LogoSpinner />
                <p className="text-slate-500">Please wait while we set up your account and grant premium access...</p>
            </div>
        </div>
    );
};

export default VolunteerOnboarding;