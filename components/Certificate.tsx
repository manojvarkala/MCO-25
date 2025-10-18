


import React, { FC, useState, useEffect, useRef } from 'react';
// FIX: Corrected import for react-router-dom to resolve module export errors.
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
import { useAppContext } from '../context/AppContext.tsx';

const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return text;
    }
};

const Certificate: FC = () => {
    const { testId = 'sample' } = useParams<{ testId?: string }>();
    // Fix: Use useNavigate for navigation in v6
    const navigate = useNavigate();
    const { user, token, isEffectivelyAdmin } = useAuth();
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

            const sampleTemplate = activeOrg.certificateTemplates.find(t => t.id === 'cert-practice');
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
                examName: 'Sample Proficiency Exam',
                // FIX: Added missing examId property to satisfy the CertificateData type.
                examId: 'sample-exam',
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
                const partialData = await googleSheetsService.getCertificateData(token, testId, isEffectivelyAdmin);

                if (partialData) {
                    partialData.candidateName = decodeHtmlEntities(partialData.candidateName);
                    partialData.examName = decodeHtmlEntities(partialData.examName);
                }

                if (partialData && partialData.examId) {
                    const exam = activeOrg.exams.find(e => e.id === partialData.examId);
                    
                    if (exam && !exam.certificateEnabled && !isEffectivelyAdmin) {
                        toast.error("A certificate is not available for this exam.");
                        navigate(`/results/${testId}`, { replace: true });
                        return;
                    }

                    const templateId = exam?.certificateTemplateId || (exam?.isPractice ? 'cert-practice' : 'cert-completion');
                    const template = activeOrg.certificateTemplates.find(t => t.id === templateId);

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
    }, [testId, user, token, navigate, activeOrg, isEffectivelyAdmin]);

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

    const { organization, template, examName } = certData;
    const hasTwoSignatures = !!(template.signature2Name && template.signature2Title);
    const isSig1Base64 = template.signature1ImageUrl && template.signature1ImageUrl.startsWith('data:image');
    const isSig2Base64 = template.signature2ImageUrl && template.signature2ImageUrl.startsWith('data:image');
    const verificationUrl = `${window.location.origin}/verify/${certData.certificateNumber}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verificationUrl)}`;
    const certificateTheme = organization.certificateThemeId || 'classic';

    return (
        <>
        <div className="max-w-5xl mx-auto bg-slate-100 p-4 sm:p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
                 <button
                    onClick={() => navigate(-1)}
                    className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition"
                >
                    <ArrowLeft size={16} />
                    <span>Back</span>
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
            
            <div
                ref={certificatePrintRef}
                data-cert-theme={certificateTheme}
                className="cert-container bg-[var(--cert-bg-color)] p-2 relative aspect-[1.414/1] w-full shadow-2xl text-[var(--cert-text-color)]"
            >
                {/* Borders */}
                <div className="cert-border cert-border--outer"></div>
                <div className="cert-border cert-border--middle"></div>
                <div className="cert-border cert-border--inner"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-slate-50 to-white/80"></div>

                <div className="relative z-10 flex flex-col h-full p-4 md:p-8 text-center">
                    {/* Header */}
                    <header className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex items-center gap-4 text-left">
                            {organization.logo && <img src={organization.logo} crossOrigin="anonymous" alt={`${organization.name} Logo`} className="h-16 w-16 object-contain" />}
                             <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-[var(--cert-header-color)] font-[var(--cert-font-display)]">{organization.name}</h1>
                                <p className="text-sm text-[var(--cert-text-muted-color)]">{organization.website}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                             <p className="text-xs text-[var(--cert-text-muted-color)]">Certificate ID</p>
                             <p className="text-sm font-semibold text-[var(--cert-text-color)] whitespace-nowrap">{certData.certificateNumber}</p>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-grow flex flex-col items-center justify-center my-4">
                        <p className="text-xl sm:text-2xl tracking-[0.2em] uppercase text-[var(--cert-text-muted-color)] font-semibold font-[var(--cert-font-display)]">{template.title}</p>
                        <p className="mt-8 text-base sm:text-lg text-[var(--cert-text-muted-color)] font-[var(--cert-font-body)]">This certificate is proudly presented to</p>
                        
                        <h2 className="font-[var(--cert-font-script)] text-5xl sm:text-6xl text-[var(--cert-header-color)] my-2 sm:my-4 px-8 border-b-2 border-[var(--cert-accent-color)]">
                            {certData.candidateName}
                        </h2>

                        <p className="text-base sm:text-lg text-[var(--cert-text-color)] max-w-2xl mx-auto font-[var(--cert-font-body)]">
                            For successfully completing the rigorous requirements of the
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--cert-primary-color)] mt-2 font-[var(--cert-font-display)]">
                            {examName}
                        </h3>
                        <p className="mt-4 text-base sm:text-lg text-[var(--cert-text-color)] font-[var(--cert-font-body)]">
                            having achieved a passing score of <strong>{certData.finalScore}%</strong>.
                        </p>
                    </main>

                    {/* Footer */}
                    <footer className="mt-auto pt-4 relative">
                        <div className="flex justify-between items-end pt-12">
                            <div className="text-center w-1/3">
                                <div className="h-12 flex items-center justify-center">
                                    {template.signature1ImageUrl ? (
                                        <img src={template.signature1ImageUrl} crossOrigin={isSig1Base64 ? undefined : "anonymous"} alt={template.signature1Name} className="h-10 mx-auto" />
                                    ) : (
                                        <p className="font-[var(--cert-font-script)] text-3xl text-[var(--cert-text-color)]">{template.signature1Name}</p>
                                    )}
                                </div>
                                <hr className="cert-hr" />
                                <p className="font-semibold text-sm mt-2">{template.signature1Name}</p>
                                <p className="text-xs text-[var(--cert-text-muted-color)]">{template.signature1Title}</p>
                            </div>

                            <div className="text-center w-1/3">
                                <p className="font-[var(--cert-font-display)] text-lg text-[var(--cert-text-color)] h-12 flex items-end justify-center pb-1">{certData.date}</p>
                                <hr className="cert-hr" />
                                <p className="font-semibold text-sm mt-2">Date</p>
                            </div>
                            
                            {hasTwoSignatures ? (
                                <div className="text-center w-1/3">
                                    <div className="h-12 flex items-center justify-center">
                                        {template.signature2ImageUrl ? (
                                            <img src={template.signature2ImageUrl} crossOrigin={isSig2Base64 ? undefined : "anonymous"} alt={template.signature2Name} className="h-10 mx-auto" />
                                        ) : (
                                            <p className="font-[var(--cert-font-script)] text-3xl text-[var(--cert-text-color)]">{template.signature2Name}</p>
                                        )}
                                    </div>
                                    <hr className="cert-hr" />
                                    <p className="font-semibold text-sm mt-2">{template.signature2Name}</p>
                                    <p className="text-xs text-[var(--cert-text-muted-color)]">{template.signature2Title}</p>
                                </div>
                            ) : <div className="w-1/3"></div>}
                        </div>
                        <div className="text-center mt-6 flex justify-between items-center border-t border-slate-200 pt-2">
                            <div className="text-left">
                                <p className="text-xs text-slate-500">Verify authenticity at:</p>
                                <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 hover:underline break-all">{verificationUrl}</a>
                            </div>
                            <img src={qrCodeUrl} alt="Verification QR Code" className="w-16 h-16" />
                        </div>
                    </footer>
                </div>
            </div>
        </div>
        </>
    );
};
export default Certificate;