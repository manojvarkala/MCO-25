







import React, { FC, useState, useEffect, useRef } from 'react';
// FIX: Use named imports for react-router-dom v6 components and hooks.
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { CertificateData } from '../types.ts';
import Spinner from './Spinner.tsx';
import LogoSpinner from './LogoSpinner.tsx';
import { Download, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { logoBase64 } from '../assets/logo.ts';
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
    const bodyText = template.body.replace('{finalScore}', certData.finalScore.toString());
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
                    className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-green-400"
                >
                    {isDownloading ? <Spinner/> : <Download size={20} />}
                    <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>
            </div>
            
            {/* Visible Certificate for Display */}
            <div className="w-full aspect-[1.414/1] bg-white p-4 font-serif-display shadow-lg border-8 border-teal-900 relative overflow-hidden">
                 {testId === 'sample' && <Watermark text="SAMPLE CERTIFICATE" />}
                 {testId !== 'sample' && <Watermark text={organization.name} />}
                <div className="w-full h-full border-2 border-teal-700 flex flex-col p-6">
                    
                    <div className="flex items-center space-x-3">
                        <img src={logoBase64} alt={`${organization.name} Logo`} className="h-14 w-14 object-contain" />
                        <div className="flex flex-col text-left">
                            <span className="text-2xl font-bold text-slate-800 font-serif">{organization.name}</span>
                            <span className="text-sm text-slate-500 font-serif">{organization.website}</span>
                        </div>
                    </div>
                                        
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <p className="text-xl text-slate-600 tracking-wider">Certificate of Achievement in</p>
                        <p className="text-4xl font-bold text-teal-800 tracking-wide mt-1">{template.title}</p>
                        
                        <div className="w-1/3 mx-auto my-4 border-b border-slate-400"></div>

                        <p className="text-lg text-slate-600">This certificate is proudly presented to</p>
                        
                        <p className="text-5xl font-script font-bold text-teal-800 my-4">
                            {certData.candidateName}
                        </p>
                        
                        <p className="text-base text-slate-700 max-w-3xl leading-relaxed" dangerouslySetInnerHTML={{ __html: bodyText }} />
                    </div>
                    
                    <div className="pt-4 mt-auto">
                         <div className={`flex ${hasTwoSignatures ? 'justify-around' : 'justify-center'} items-end w-full`}>
                            {template.signature1Name && template.signature1ImageBase64 && (
                                <div className="text-center w-72">
                                <img 
                                    src={template.signature1ImageBase64} 
                                    alt={`${template.signature1Name} Signature`}
                                    className="h-16 mx-auto object-contain mb-2"
                                />
                                <div className="border-t border-slate-400 pt-2">
                                    <p className="text-sm text-slate-700 tracking-wider">
                                        <strong>{template.signature1Name}</strong>
                                    </p>
                                    <p className="text-xs text-slate-600 tracking-wider">
                                        {template.signature1Title}
                                    </p>
                                </div>
                                </div>
                            )}
                            {hasTwoSignatures && (
                                <div className="text-center w-72">
                                <img 
                                    src={template.signature2ImageBase64} 
                                    alt={`${template.signature2Name} Signature`}
                                    className="h-16 mx-auto object-contain mb-2"
                                />
                                <div className="border-t border-slate-400 pt-2">
                                    <p className="text-sm text-slate-700 tracking-wider">
                                        <strong>{template.signature2Name}</strong>
                                    </p>
                                    <p className="text-xs text-slate-600 tracking-wider">
                                        {template.signature2Title}
                                    </p>
                                </div>
                                </div>
                            )}
                        </div>

                        <div className="w-full flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-300 mt-6">
                            <span>Certificate No: <strong>{certData.certificateNumber}</strong></span>
                            <span>Date of Issue: <strong>{certData.date}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Hidden, print-quality certificate for PDF generation */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1123px', height: '794px', color: 'black' }}>
             <div ref={certificatePrintRef} className="w-full h-full bg-white font-serif-display relative overflow-hidden flex flex-col" style={{ padding: '16px', border: '32px solid #0f766e' }}>
                {testId === 'sample' && <Watermark text="SAMPLE CERTIFICATE" />}
                {testId !== 'sample' && <Watermark text={organization.name} />}
                <div className="w-full h-full flex flex-col" style={{ padding: '24px', border: '8px solid #115e59' }}>
                    <div className="flex items-center" style={{ gap: '12px' }}>
                        <img src={logoBase64} alt={`${organization.name} Logo`} style={{ height: '56px', width: '56px', objectFit: 'contain' }} />
                        <div className="flex flex-col text-left">
                            <span className="font-bold font-serif" style={{ fontSize: '24px', color: '#1e293b' }}>{organization.name}</span>
                            <span className="font-serif" style={{ fontSize: '14px', color: '#64748b' }}>{organization.website}</span>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <p style={{ fontSize: '20px', color: '#475569', letterSpacing: '0.05em' }}>Certificate of Achievement in</p>
                        <p className="font-bold" style={{ fontSize: '38px', color: '#134e4a', letterSpacing: '0.025em', marginTop: '4px' }}>{template.title}</p>
                        <div style={{ width: '33.33%', margin: '16px auto', borderBottom: '1px solid #94a3b8' }}></div>
                        <p style={{ fontSize: '18px', color: '#475569' }}>This certificate is proudly presented to</p>
                        <p className="font-script font-bold" style={{ fontSize: '64px', color: '#134e4a', margin: '16px 0' }}>{certData.candidateName}</p>
                        <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.625', maxWidth: '896px' }} dangerouslySetInnerHTML={{ __html: bodyText }} />
                    </div>
                    <div style={{ paddingTop: '16px', marginTop: 'auto' }}>
                        <div className={`flex ${hasTwoSignatures ? 'justify-around' : 'justify-center'} items-end w-full`}>
                           {template.signature1Name && template.signature1ImageBase64 && (
                                <div className="text-center" style={{ width: '288px' }}>
                                    <img src={template.signature1ImageBase64} alt={`${template.signature1Name} Signature`} style={{ height: '64px', margin: '0 auto 8px', objectFit: 'contain' }} />
                                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                                        <p style={{ fontSize: '14px', color: '#334155', letterSpacing: '0.05em' }}><strong>{template.signature1Name}</strong></p>
                                        <p style={{ fontSize: '12px', color: '#475569', letterSpacing: '0.05em' }}>{template.signature1Title}</p>
                                    </div>
                                </div>
                           )}
                           {hasTwoSignatures && (
                                <div className="text-center" style={{ width: '288px' }}>
                                    <img src={template.signature2ImageBase64} alt={`${template.signature2Name} Signature`} style={{ height: '64px', margin: '0 auto 8px', objectFit: 'contain' }} />
                                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                                        <p style={{ fontSize: '14px', color: '#334155', letterSpacing: '0.05em' }}><strong>{template.signature2Name}</strong></p>
                                        <p style={{ fontSize: '12px', color: '#475569', letterSpacing: '0.05em' }}>{template.signature2Title}</p>
                                    </div>
                                </div>
                           )}
                        </div>
                        <div className="w-full flex justify-between" style={{ color: '#64748b', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', marginTop: '24px' }}>
                            <span>Certificate No: <strong>{certData.certificateNumber}</strong></span>
                            <span>Date of Issue: <strong>{certData.date}</strong></span>
                        </div>
                    </div>
                </div>
             </div>
        </div>
        </>
    );
};

export default Certificate;