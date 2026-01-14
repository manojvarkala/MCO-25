import React, { FC, useState } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;
import toast from 'react-hot-toast';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import LogoSpinner from './LogoSpinner.tsx';
import { Beaker, Send, AlertCircle } from 'lucide-react';

interface OnboardingInfo {
    token: string;
    email: string;
}

const BetaRegistration: FC = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        deviceType: '',
        os: '',
        browser: '',
        experience: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo | null>(null);
    const [isResending, setIsResending] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrorMsg(null); // Clear error on input
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);
        const toastId = toast.loading('Submitting your registration...');

        try {
            const response = await googleSheetsService.registerBetaTester(formData);
            if (response.success) {
                toast.success(response.message || 'Registration successful! Please check your email.', { id: toastId });
                setIsSuccess(true);
                if (response.onboarding_token && response.user_email) {
                    setOnboardingInfo({ token: response.onboarding_token, email: response.user_email });
                }
            } else {
                throw new Error(response.message || 'An unknown error occurred.');
            }
        } catch (error: any) {
            console.error("Registration Error:", error);
            const message = error.message || 'Failed to submit registration. Please try again.';
            toast.error(message, { id: toastId });
            setErrorMsg(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!onboardingInfo) return;
        setIsResending(true);
        try {
            await googleSheetsService.publicResendOnboardingEmail(onboardingInfo.token, onboardingInfo.email);
            toast.success("Welcome email has been resent!");
        } catch (error: any) {
            toast.error(error.message || "Failed to resend email.");
        } finally {
            setIsResending(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
                <Beaker className="mx-auto h-12 w-12 text-green-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Thank You for Registering!</h1>
                <p className="text-slate-600 mt-2">
                    We've sent a welcome email with your unique access link. Please check your inbox (and spam folder) to get started.
                </p>
                
                {onboardingInfo && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-600">Didn't receive the email?</p>
                        <button 
                            onClick={handleResend}
                            disabled={isResending}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isResending ? <LogoSpinner /> : <Send size={16} />}
                            {isResending ? 'Resending...' : 'Click to Resend Email'}
                        </button>
                    </div>
                )}
                
                <Link to="/" className="inline-block mt-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">
                    Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <div className="text-center mb-8">
                <Beaker className="mx-auto h-12 w-12 text-cyan-500" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Become a Beta Tester</h1>
                <p className="text-slate-500 mt-2">
                    Help us test our exam portal and get <strong>1 Month of FREE Premium Access</strong> and a <strong>50% affiliate commission</strong> as a thank you!
                </p>
            </div>
            
            {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="text-red-800 font-bold text-sm">Registration Failed</h3>
                        <p className="text-red-700 text-sm mt-1">{errorMsg}</p>
                        {errorMsg.includes("connect") && (
                            <p className="text-red-600 text-xs mt-2">Hint: Check your internet connection. If this persists, our registration server might be temporarily down.</p>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">Full Name</label>
                        <input type="text" name="fullName" id="fullName" required onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-200 focus:ring-opacity-50" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                        <input type="email" name="email" id="email" required onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-200 focus:ring-opacity-50" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="deviceType" className="block text-sm font-medium text-slate-700">Device Type</label>
                        <select name="deviceType" id="deviceType" required onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-200 focus:ring-opacity-50">
                            <option value="">Select...</option>
                            <option>Laptop/Desktop</option>
                            <option>Tablet</option>
                            <option>Mobile</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="os" className="block text-sm font-medium text-slate-700">Operating System</label>
                        <select name="os" id="os" required onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-200 focus:ring-opacity-50">
                            <option value="">Select...</option>
                            <option>Windows</option>
                            <option>macOS</option>
                            <option>Android</option>
                            <option>iOS</option>
                            <option>Linux</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="browser" className="block text-sm font-medium text-slate-700">Browser</label>
                        <select name="browser" id="browser" required onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-200 focus:ring-opacity-50">
                            <option value="">Select...</option>
                            <option>Chrome</option>
                            <option>Firefox</option>
                            <option>Safari</option>
                            <option>Edge</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-slate-700">Medical Coding Experience</label>
                    <select name="experience" id="experience" required onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-cyan-500 focus:ring focus:ring-cyan-200 focus:ring-opacity-50">
                        <option value="">Select...</option>
                        <option>CPC Certified</option>
                        <option>CPC Student</option>
                        <option>ICD-10 Learner</option>
                        <option>None (tech background only)</option>
                        <option>Other</option>
                    </select>
                </div>
                 <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <input id="agreement" name="agreement" type="checkbox" className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500" required />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="agreement" className="font-medium text-slate-700">I agree to test the platform and report feedback.</label>
                        <p className="text-slate-500">I understand I will receive 1 Month FREE Premium Access + 50% Affiliate Revenue upon successful testing.</p>
                    </div>
                </div>

                <div>
                    <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
                        {isSubmitting ? <LogoSpinner /> : <Send size={16} />}
                        Submit Application
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BetaRegistration;