
import * as React from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import Spinner from './Spinner.tsx';
import { User, Save, X } from 'lucide-react';

interface UpdateNameModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UpdateNameModal: React.FC<UpdateNameModalProps> = ({ isOpen, onClose }) => {
    const { user, token, updateUserName } = useAuth();
    const [name, setName] = React.useState(user?.name || '');
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const handleSave = async () => {
        if (!name.trim() || !name.includes(' ')) {
            toast.error("Please enter your full name (first and last name).");
            return;
        }
        if (!token) {
            toast.error("Authentication error. Please re-login.");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading('Saving your name...');

        try {
            await googleSheetsService.updateUserName(token, name.trim());
            updateUserName(name.trim());
            toast.success("Name updated successfully!", { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error(error.message || "An error occurred while saving.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="update-name-title">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 id="update-name-title" className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <User size={20} className="text-cyan-600" />
                        Update Your Name
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" aria-label="Close modal">
                        <X size={24} />
                    </button>
                </div>
                <p className="text-slate-600 mb-6">
                    Your name is used on your certificate. Please ensure it is your full legal name.
                </p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            placeholder="e.g., John Doe"
                            disabled={isSaving}
                            aria-required="true"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400"
                        >
                            {isSaving ? <Spinner /> : <Save size={16} />}
                            <span>{isSaving ? 'Saving...' : 'Save Name'}</span>
                        </button>
                    </div>
                </div>
                 <style>{`
                    @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-up {
                        animation: fade-in-up 0.3s ease-out forwards;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default UpdateNameModal;
