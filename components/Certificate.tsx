import React, { FC, useState, useEffect, useRef } from 'react';
// FIX: Corrected import statement for react-router-dom to resolve module export errors.
import { useParams, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { CertificateData } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Download, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext.tsx';

const Watermark: FC<{ text: string }> = ({ text }) => (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-8 pointer-events-none overflow-hidden p-4">
        {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center -rotate-45">
                <p className="text-gray-400 font-bold text-2xl md:text-3xl tracking-wider opacity-10 select-none text-center leading-tight">
                    {text}
                </p>
            </div>
        ))}
    </div>
);

const Certificate: FC = () => {
    const { testId = 'sample' } = useParams<{ testId?: string }>();
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const { activeOrg } = useAppContext();
    const [certData, setCertData] = useState<CertificateData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const certificatePrintRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Handling the sample certificate locally without an API call.
        if (testId === 'sample') {
            if (!user || !activeOrg) {
                if (!activeOrg) setIsLoading(true); // Still waiting for context
                return;
            }

            const sampleTemplate = activeOrg.certificateTemplates.find(t => t.id === 'cert-practice-1');
            if (!sampleTemplate) {
                toast.error("Sample certificate template not found.");
                navigate('/dashboard');
                return;
            }

            const sampleCertData: CertificateData = {
                certificateNumber: 'SAMPLE-123456',
                candidateName: user.name || 'Sample Candidate',
                finalScore: 95,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                totalQuestions: 100,
                organization: activeOrg,
                template: sampleTemplate,
            };
            setCertData(sampleCertData);
            setIsLoading(false);
            return; // End execution for sample
        }

        // Fetch data for a real certificate
        const fetchCertificateData = async () => {
            if (!user || !token || !activeOrg) {
                if (!activeOrg) setIsLoading(true); // Still loading
                return;
            }
            
            setIsLoading(true);
            try {
                // The user object is no longer needed here; it's derived from the token on the backend.
                const partialData = await googleSheetsService.getCertificateData(token, testId);
                if (partialData && partialData.examId) {
                    const exam = activeOrg.exams.find(e => e.id === partialData.examId);
                    const template = activeOrg.certificateTemplates.find(t => t.id === exam?.certificateTemplateId);

                    if (exam && template) {
                        const fullCertData: CertificateData = {
                            ...partialData,
                            organization: activeOrg,
                            template: template,
                            totalQuestions: exam.numberOfQuestions
                        };
                        setCertData(fullCertData);
                    } else {
                        toast.error("Certificate configuration missing in the app.");
                        navigate('/dashboard');
                    }
                } else {
                    toast.error("Certificate not earned or result not found.");
                    navigate('/dashboard');
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to load certificate data.");
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCertificateData();
    }, [testId, user, token, navigate, activeOrg]);

    const handleDownload = async () => {
        if (!certificatePrintRef.current || !certData) return;
        setIsDownloading(true);
        const toastId = toast.loading('Generating PDF...');

        try {
            const canvas = await html2canvas(certificatePrintRef.current, {
                scale: 2, useCORS: true, backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png', 0.95);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
// Fix: Corrected the regular expression to properly replace whitespace characters in the filename.
            pdf.save(`Certificate-of-Completion-${certData.candidateName.replace(/\s+/g, '_')}.pdf`);
            toast.dismiss(toastId);
            toast.success("Certificate downloaded!");
        } catch(error) {
            toast.dismiss(toastId);
            toast.error("Could not download PDF. Please try again.");
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Loading your certificate...</p></div>;
    }

    if (!certData) {
        return <div className="text-center p-8"><p>No certificate data available.</p></div>;
    }

    const { organization, template } = certData;
    const bodyText = template.body.replace('{finalScore}', `<strong>${certData.finalScore}%</strong>`);
    const hasTwoSignatures = !!(template.signature2Name && template.signature2ImageBase64);

    return (
        <>
        <div className="max-w-5xl mx-auto bg-slate-100 p-4 sm:p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
                 <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-slate-400"
                >
                    {isDownloading ? <Spinner /> : <Download size={16} />}
                    <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>
            </div>
            
            <div ref={certificatePrintRef} className="bg-white border-8 border-gray-300 p-8 relative aspect-[1.414/1] w-full shadow-2xl font-serif">
                <Watermark text={organization.name} />
                <div className="relative z-10 flex flex-col h-full text-center">
                    <div className="flex justify-center items-center mb-8">
                        {organization.logo && <img src={organization.logo} alt={`${organization.name} Logo`} className="h-24 object-contain" />}
                    </div>

                    <p className="text-2xl text-gray-500 tracking-widest uppercase">Certificate of Completion</p>
                    <p className="text-lg text-gray-600 mt-4">This certificate is proudly presented to</p>
                    
                    <h2 className="text-5xl font-bold text-gray-800 my-8 border-b-2 border-gray-300 pb-4">{certData.candidateName}</h2>

                    <div className="text-lg text-gray-600 flex-grow">
                         <p>For successfully completing the <strong>{template.title}</strong></p>
                         <p className="mt-2" dangerouslySetInnerHTML={{ __html: bodyText.replace(/\n/g, '<br />') }} />
                    </div>
                    
                    <div className="mt-auto flex justify-between items-end pt-8">
                         <div className="text-center w-2/5">
                            {template.signature1ImageBase64 && <img src={template.signature1ImageBase64} alt={template.signature1Name} className="h-12 mx-auto" />}
                            <p className="border-t-2 border-gray-400 mt-2 pt-2 font-semibold">{template.signature1Name}</p>
                            <p className="text-sm text-gray-500">{template.signature1Title}</p>
                        </div>

                        <div className="text-center w-1/5">
                             <p className="text-sm text-gray-500">Issued On</p>
                             <p className="font-semibold border-t-2 border-gray-400 mt-2 pt-2">{certData.date}</p>
                        </div>
                        
                        {hasTwoSignatures && (
                            <div className="text-center w-2/5">
                                {template.signature2ImageBase64 && <img src={template.signature2ImageBase64} alt={template.signature2Name} className="h-12 mx-auto" />}
                                <p className="border-t-2 border-gray-400 mt-2 pt-2 font-semibold">{template.signature2Name}</p>
                                <p className="text-sm text-gray-500">{template.signature2Title}</p>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 mt-4">Certificate ID: {certData.certificateNumber}</p>
                </div>
            </div>
        </div>
        </>
    );
};
// FIX: Added default export to resolve module import error.
export default Certificate;