import React, { FC, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ShieldCheck, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const VerifyPage: FC = () => {
    const [inputId, setInputId] = useState('');
    const history = useHistory();

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedId = inputId.trim();
        if (!trimmedId) {
            toast.error("Please enter a Certificate ID or URL.");
            return;
        }

        let finalId = trimmedId;
        // Check if it's a full URL and extract the ID
        if (finalId.includes('/verify/')) {
            const parts = finalId.split('/verify/');
            finalId = parts[parts.length - 1];
        }
        
        history.push(`/verify/${encodeURIComponent(finalId)}`);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="text-center mb-8">
                <ShieldCheck className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Verify a Certificate</h1>
                <p className="text-slate-500 mt-2">
                    Enter the Certificate ID or the full verification URL found on the certificate to confirm its authenticity.
                </p>
            </div>
            
            <form onSubmit={handleVerify} className="space-y-6">
                 <div>
                    <label htmlFor="certificateId" className="block text-sm font-medium text-slate-700 sr-only">
                        Certificate ID or URL
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            id="certificateId"
                            value={inputId}
                            onChange={(e) => setInputId(e.target.value)}
                            className="block w-full shadow-sm sm:text-sm border-slate-300 rounded-md py-3 pl-4 pr-12 focus:ring-cyan-500 focus:border-cyan-500"
                            placeholder="e.g., MCO-123-456-789"
                            required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                             <Search className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400"
                    >
                        <ShieldCheck size={16} />
                        <span>Verify</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default VerifyPage;