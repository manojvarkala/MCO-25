

import React, { FC, useState, useEffect, useRef } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
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
import Seal from '../assets/Seal.tsx';

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
    const history = useHistory();
    const location = useLocation();
    const { user, token, isEffectivelyAdmin } = useAuth();
    const { activeOrg } = useAppContext();
    const [certData, setCertData] = useState<CertificateData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const certificatePrintRef = useRef<HTMLDivElement>(null);
    
    const certificateThemeIdFromOrg = activeOrg?.certificateThemeId || 'classic';
    const [effectiveTheme, setEffectiveTheme] = useState(certificateThemeIdFromOrg);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const themeIdFromUrl = searchParams.get('theme_id');

        if (testId === 'sample') {
            if (!user || !activeOrg) {
                if (!activeOrg) setIsLoading(true);
                return;
            }

            const templateIdFromUrl = searchParams.get('template_id');
            const templateToUse = templateIdFromUrl
                ? activeOrg.certificateTemplates.find(t => t.id === templateIdFromUrl)
                : activeOrg.certificateTemplates.find(t => t.id === 'cert-practice');

            if (!templateToUse) {
                toast.error("Sample certificate template not found.");
                history.push('/dashboard');
                return;
            }
            
            setEffectiveTheme(themeIdFromUrl || certificateThemeIdFromOrg);

            const sampleCertData: CertificateData = {
                certificateNumber: 'SAMPLE-123456',
                candidateName: user.name || 'Sample Candidate',
                finalScore: 95,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                totalQuestions: 100,
                organization: activeOrg,
                template: templateToUse,
                examName: 'Sample Proficiency Exam',
                examId: 'sample-exam',
            };
            setCertData(sampleCertData);
            setIsLoading(false);
            return;
        }

        // For real certificates, always use the organization's default theme setting
        setEffectiveTheme(certificateThemeIdFromOrg);

        const fetchCertificateData = async () => {
            if (!user || !token || !activeOrg) {
                if (!activeOrg) setIsLoading(true);
                return;
            }
            
            setIsLoading(true);
            try {
                const partialData = await googleSheetsService.getCertificateData(token, testId, isEffectivelyAdmin);

                if (partialData) {
                    partialData.candidateName = decodeHtmlEntities(partialData.candidateName);
                    partialData.examName = decodeHtmlEntities(partialData.examName);
                }

                if (partialData && partialData.examId) {
                    const exam = activeOrg.exams.find(e => e.id === partialData.examId);
                    
                    if (exam && !exam.certificateEnabled && !isEffectivelyAdmin) {
                        toast.error("A certificate is not available for this exam.");
                        history.replace(`/results/${testId}`);
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
                        history.push('/dashboard');
                    }
                } else {
                    toast.error("Certificate not earned or result not found.");
                    history.push('/dashboard');
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to load certificate data.");
                history.push('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCertificateData();
    }, [testId, user, token, history, activeOrg, isEffectivelyAdmin, location.search, certificateThemeIdFromOrg]);

    const handleDownload = async () => {
        if (!certificatePrintRef.current || !certData) return;
        setIsDownloading(true);
        const toastId = toast.loading('Generating PDF...');

        try {
            const canvas = await html2canvas(certificatePrintRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png', 0.95);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
    const isSig1Base64 = template.signature1ImageUrl && template.signature1ImageUrl.startsWith('data:image');
    const isSig2Base64 = template.signature2ImageUrl && template.signature2ImageUrl.startsWith('data:image');
    const verificationUrl = `${window.location.origin}/verify/${certData.certificateNumber}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verificationUrl)}`;

    const sanitizeBody = (body: string) => {
        let sanitized = body || '';
        // Remove common prefixes, case-insensitively
        sanitized = sanitized.replace(/^this is to certify that/i, '').trim();
        sanitized = sanitized.replace(/^this certifies that/i, '').trim();
        // Robustly remove the candidate name placeholder, with or without surrounding tags
        sanitized = sanitized.replace(/<strong>{\s*candidateName\s*}<\/strong>|{\s*candidateName\s*}/gi, '').trim();
        return sanitized;
    };

    const processedBody = sanitizeBody(template.body)
        .replace(/{examName}/g, `<strong>${examName}</strong>`);
    
    const classicBody = processedBody.replace(/{finalScore}%/g, `<strong>${certData.finalScore.toFixed(0)}%</strong>`);
    const modernBody = processedBody.replace(/{finalScore}%/g, '');


    const classicCertificate = (
        <div className="cert-container-classic">
            <div className="cert-border-pattern">
                <div className="cert-border-line">
                    <div className="cert-content-wrapper">
                         <div className="cert-content-inner">
                            {/* Header */}
                            <header className="cert-header">
                                {organization.logo && (
                                    <img src={organization.logo} crossOrigin="anonymous" alt={`${organization.name} Logo`} className="cert-logo" />
                                )}
                                <div className="cert-brain-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
                                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 9.5 7v0A2.5 2.5 0 0 1 7 4.5v0A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v0A2.5 2.5 0 0 1 14.5 7v0A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 14.5 2Z" /><path d="M12 18H5c-1.1 0-2-1.34-2-3v-1.5c0-.83.67-1.5 1.5-1.5.83 0 1.5.67 1.5 1.5v.5a.5.5 0 0 0 .5.5h1" /><path d="M12 18h7c1.1 0 2-1.34 2-3v-1.5c0-.83-.67-1.5-1.5-1.5-.83 0-1.5.67-1.5 1.5v.5a.5.5 0 0 1-.5.5h-1" /><path d="M12 18v-5.5" /><path d="M12 12.5v-2" /><path d="M12 7.5V6" /><path d="M7 15a2.5 2.5 0 0 1 0-5" /><path d="M17 15a2.5 2.5 0 0 0 0-5" />
                                    </svg>
                                </div>
                                <div className="cert-org-details">
                                    <p className="cert-org-name">{organization.name}</p>
                                    <p className="cert-org-address">{organization.address || organization.website}</p>
                                </div>
                            </header>
                            
                            {/* Main Body */}
                            <main className="cert-body">
                                <p className="cert-title-main">{template.title}</p>
                                <p className="cert-text-normal mt-4">This is to certify that</p>
                                <h2 className="cert-candidate-name">{certData.candidateName}</h2>
                                <p className="cert-text-normal max-w-xl mx-auto" dangerouslySetInnerHTML={{ __html: classicBody }} />
                            </main>

                            {/* Footer */}
                            <footer className="cert-footer">
                                <div className="cert-footer-item">
                                    <div className="cert-item-value"><p>{certData.date}</p></div>
                                    <hr className="cert-hr"/>
                                    <div className="cert-item-label-group"><p className="cert-item-label">Date of Completion</p></div>
                                </div>

                                <div className="cert-footer-item">
                                    <div className="cert-signatures-container">
                                        {template.signature1Name && (
                                            <div className="cert-signature-block">
                                                <div className="cert-item-value">
                                                    {template.signature1ImageUrl ? <img src={template.signature1ImageUrl} crossOrigin={isSig1Base64 ? undefined : "anonymous"} alt={template.signature1Name} /> : <p className="cert-signature-text">{template.signature1Name}</p>}
                                                </div>
                                                <hr className="cert-hr"/>
                                                <div className="cert-item-label-group">
                                                    <p className="cert-item-label font-semibold">{template.signature1Name}</p>
                                                    <p className="cert-item-label">{template.signature1Title}</p>
                                                </div>
                                            </div>
                                        )}
                                        {template.signature2Name && (
                                            <div className="cert-signature-block">
                                                <div className="cert-item-value">
                                                    {template.signature2ImageUrl ? <img src={template.signature2ImageUrl} crossOrigin={isSig2Base64 ? undefined : "anonymous"} alt={template.signature2Name} /> : <p className="cert-signature-text">{template.signature2Name}</p>}
                                                </div>
                                                <hr className="cert-hr"/>
                                                <div className="cert-item-label-group">
                                                    <p className="cert-item-label font-semibold">{template.signature2Name}</p>
                                                    <p className="cert-item-label">{template.signature2Title}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="cert-footer-item">
                                    <div className="cert-item-value"><p>{certData.certificateNumber}</p></div>
                                    <hr className="cert-hr"/>
                                    <div className="cert-item-label-group"><p className="cert-item-label">Certificate Number</p></div>
                                </div>
                            </footer>

                            <div className="cert-qr-footer">
                                <img src={qrCodeUrl} alt="Verification QR Code" className="cert-qr-code" />
                                <p>Verify at: <br/> {verificationUrl}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const modernCertificate = (
        <div className="cert-container-modern">
            <div className="cert-modern-sidebar">
                <div className="cert-modern-sidebar__header">
                    {organization.logo && <img src={organization.logo} crossOrigin="anonymous" alt={`${organization.name} Logo`} className="cert-logo-modern" />}
                    <h3 className="cert-org-name-modern mt-4">{organization.name}</h3>
                    <p className="cert-org-website-modern">{organization.website}</p>
                </div>
                <div className="cert-qr-footer-modern">
                    <img src={qrCodeUrl} alt="Verification QR Code" className="cert-qr-code-modern" />
                    <p className="cert-verification-text">To verify this certificate, scan the QR code or visit:<br />{verificationUrl}</p>
                </div>
            </div>
            <div className="cert-main-panel">
                <header>
                    <h1 className="cert-title-main-modern">{template.title}</h1>
                </header>
                <main className="cert-body-modern">
                    <p className="cert-recipient-label">This is to certify that</p>
                    <h2 className="cert-candidate-name-modern">{certData.candidateName}</h2>
                    <p className="cert-completion-text" dangerouslySetInnerHTML={{ __html: modernBody }} />
                </main>
                <footer className="cert-footer-modern">
                    <div className="cert-details-grid">
                        <div className="cert-detail-item"><h4>Final Score</h4><p>{certData.finalScore.toFixed(0)}%</p></div>
                        <div className="cert-detail-item"><h4>Date Issued</h4><p>{certData.date}</p></div>
                    </div>
                    <div className="cert-signatures-container-modern">
                        {template.signature1Name && (
                            <div className="cert-signature-block-modern">
                                {template.signature1ImageUrl ? <img src={template.signature1ImageUrl} crossOrigin={isSig1Base64 ? undefined : "anonymous"} alt={template.signature1Name} className="cert-signature-image-modern" /> : <p className="cert-signature-text-modern">{template.signature1Name}</p>}
                                <div className="cert-signature-line"></div>
                                <p className="cert-signature-name">{template.signature1Name}</p>
                                <p className="cert-signature-title">{template.signature1Title}</p>
                            </div>
                        )}
                         {template.signature2Name && (
                            <div className="cert-signature-block-modern">
                                {template.signature2ImageUrl ? <img src={template.signature2ImageUrl} crossOrigin={isSig2Base64 ? undefined : "anonymous"} alt={template.signature2Name} className="cert-signature-image-modern" /> : <p className="cert-signature-text-modern">{template.signature2Name}</p>}
                                <div className="cert-signature-line"></div>
                                <p className="cert-signature-name">{template.signature2Name}</p>
                                <p className="cert-signature-title">{template.signature2Title}</p>
                            </div>
                        )}
                    </div>
                </footer>
                 <Seal className="cert-modern-seal" />
            </div>
        </div>
    );
    
    return (
        <>
        <div className="max-w-5xl mx-auto bg-slate-100 p-4 sm:p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
                 <button
                    onClick={() => history.goBack()}
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
            
            <div ref={certificatePrintRef} className="cert-base">
                {effectiveTheme === 'modern' ? modernCertificate : classicCertificate}
            </div>
        </div>
        </>
    );
};
export default Certificate;
