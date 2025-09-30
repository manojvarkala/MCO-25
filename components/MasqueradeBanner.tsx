
import React, { FC } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Eye, Shield } from 'lucide-react';

const MasqueradeBanner: FC = () => {
    const { user, isMasquerading, toggleMasquerade } = useAuth();

    if (!user?.isAdmin || !isMasquerading) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 p-2 text-center text-sm font-semibold z-[101] shadow-lg">
            <div className="container mx-auto flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                    <Eye size={16} />
                    <span>You are currently viewing the app as a regular user.</span>
                </div>
                <button
                    onClick={toggleMasquerade}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition"
                >
                    <Shield size={16} />
                    Return to Admin View
                </button>
            </div>
        </div>
    );
};

export default MasqueradeBanner;
