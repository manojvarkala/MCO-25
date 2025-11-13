import React, { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import { Send, MessageSquare, CreditCard } from 'lucide-react';
import Spinner from './Spinner.tsx';
import { useAppContext } from '../context/AppContext.tsx';

const Feedback: FC = () => {
    const { token } = useAuth();
    const { activeOrg } = useAppContext();
    const [category, setCategory] = useState('General Feedback');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const loginUrl = activeOrg ? `https://${activeOrg.website}/exam-login/` : '#';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error("Please enter your feedback before submitting.");
            return;
        }
        if (!token) {
            toast.error("You must be logged in to submit feedback.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('Submitting your feedback...');

        try {
            await googleSheetsService.submitFeedback(token, category, message);
            toast.success("Thank you! Your feedback has been sent.", { id: toastId });
            setMessage('');
            setCategory('General Feedback');
        } catch (error: any) {
            toast.error(error.message || "Failed to send feedback.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="text-center mb-8">
                <MessageSquare className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Share Your Feedback</h1>
                <p className="text-slate-500 mt-2">We value your opinion. Let us know how we can improve.</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-r-lg" role="alert">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-blue-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium">Facing a Payment Issue?</h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>If you're experiencing an error during checkout or with a payment, please select the "Payment or Checkout Issue" category and provide as much detail as possible, including:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>The name of the exam or product you were trying to purchase.</li>
                                <li>Your order number, if you received one.</li>
                                <li>The error message you saw.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                 <fieldset className="space-y-6">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
                            Feedback Category
                        </label>
                        <select
                            id="category"
                            name="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
                        >
                            <option>General Feedback</option>
                            <optgroup label="Beta Testing">
                                <option>UI/Visual Feedback</option>
                                <option>Functionality / Bug Report</option>
                                <option>Performance (e.g. slowness)</option>
                                <option>General Suggestions</option>
                            </optgroup>
                            <option>Exam Content Issue</option>
                            <option>Feature Request</option>
                            <option>Payment or Checkout Issue</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-slate-700">
                            Your Message
                        </label>
                        <textarea
                            id="message"
                            name="message"
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                            placeholder="Tell us what's on your mind..."
                            required
                        />
                    </div>
                 </fieldset>

                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !message.trim()}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Spinner /> : <Send size={16} />}
                        <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Feedback;