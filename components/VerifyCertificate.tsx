import React, { FC, useState, useEffect } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors in this environment.
import * as ReactRouterDOM from 'react-router-dom';
const { useParams } = ReactRouterDOM as any;
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { VerificationData } from '../types.ts';
import LogoSpinner from './LogoSpinner.tsx';
import { CheckCircle, XCircle, Award } from 'lucide-react';
import { useAppContext } from '../context/AppContext.tsx';

const VerifyCertificate: FC = () => {
    // FIX: Removed generic type from useParams to resolve "Untyped function calls may not accept type arguments" error.
    const { certId } = useParams();
    const { activeOrg } = useAppContext();
    const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (certId) {
            const doVerify = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await googleSheetsService.verifyCertificate(certId);
                    setVerificationData(data);
                } catch (e: any) {
                    setError(e.message || "This certificate could not be verified or is invalid.");
                } finally {
                    setIsLoading(false);
                }
            };
            doVerify();
        }
    }, [certId]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <>
                    <h2 className="text-2xl font-bold text-slate-800">Verifying Certificate...</h2>
                    <LogoSpinner />
                </>
            );
        }
        if (error) {
            return (
                <>
                    <XCircle className="h-16 w-16 text-red-500" />
                    <h2 className="text-2xl font-bold text-slate-800 mt-4">Verification Failed</h2>
                    <p className="text-slate-500 mt-2">{error}</p>
                </>
            );
        }
        if (verificationData) {
            return (
                <>
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <h2 className="text-2xl font-bold text-slate-800 mt-4">Certificate Verified</h2>
                    <div className="text-left w-full mt-6 space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                            <p className="text-sm text-slate-500">This is to certify that</p>
                            <p className="text-xl font-bold text-slate-900">{verificationData.candidateName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Successfully passed the</p>
                            <p className="text-xl font-bold text-slate-900">{verificationData.examName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                             <div>
                                <p className="text-sm text-slate-500">Date Issued</p>
                                <p className="text-lg font-semibold text-slate-700">{verificationData.date}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Passing Score</p>
                                <p className="text-lg font-semibold text-slate-700">{verificationData.finalScore.toFixed(0)}%</p>
                            </div>
                        </div>
                    </div>
                     <p className="text-xs text-slate-400 mt-4">Issued by {activeOrg?.name || 'the organization'}.</p>
                </>
            );
        }
        return null;
    };

    return (
        <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center flex flex-col items-center">
                <Award className="h-12 w-12 text-cyan-500 mb-4" />
                {renderContent()}
            </div>
        </div>
    );
};

export default VerifyCertificate;