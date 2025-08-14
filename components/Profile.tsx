import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { User } from 'lucide-react';

const Profile: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center space-x-4 mb-6">
                <div className="bg-cyan-100 p-3 rounded-full">
                    <User className="h-8 w-8 text-cyan-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
                    <p className="text-slate-500">Your account details.</p>
                </div>
            </div>

            {user ? (
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-slate-500">Full Name</label>
                        <p className="text-lg font-semibold text-slate-800">{user.name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-slate-500">Email Address</label>
                        <p className="text-lg font-semibold text-slate-800">{user.email}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-slate-500">User ID</label>
                        <p className="text-lg font-semibold text-slate-800">{user.id}</p>
                    </div>
                    {user.isAdmin && (
                         <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-lg font-semibold text-green-800">You have Administrator privileges.</p>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-center text-slate-500">Could not load user profile.</p>
            )}
        </div>
    );
};

export default Profile;