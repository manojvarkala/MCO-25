import React, { FC, useState, useEffect, useRef } from 'react';
// FIX: Using wildcard import for react-router-dom to resolve missing named export errors.
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate, useLocation } = ReactRouterDOM as any;
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { CertificateData } from '../types.ts';
import LogoSpinner from './LogoSpinner.tsx';
import { Download, ArrowLeft, Shield, Award } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext.tsx';
import Seal from '../assets/Seal.tsx';
import { localLogos } from '../assets/localLogos.ts';

const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('div');
        textarea.innerHTML = text;
        return textarea.textContent || textarea.innerText || '';
    } catch (e) {
        return text;
    }
};

const Certificate: FC = () => {
    const { testId = 'sample' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, token, isBetaTester, isEffectivelyAdmin } = useAuth();
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
            if (!user || !activeOrg) return;
            const templateIdFromUrl = searchParams.get('template_id');
            
            let templateToUse = null;
            if (templateIdFromUrl) {
                templateToUse = activeOrg.certificateTemplates.find(t => t.id === templateIdFromUrl);
            }
            if (!templateToUse) {
                templateToUse = activeOrg.certificateTemplates.find(t => t.id === 'cert-completion') || activeOrg.certificateTemplates[0];
            }

            if (!templateToUse) {
                toast.error("Template not available for preview.");
                navigate('/admin/programs');
                return;
            }
            
            setEffectiveTheme(themeIdFromUrl || certificateThemeIdFromOrg);
            setCertData({
                certificateNumber: 'VERIFY-PREVIEW-123456',
                candidateName: user.name || 'John Q. Candidate',
                finalScore: 98,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                totalQuestions: 100,
                organization: activeOrg,
                template: templateToUse,
                examName: 'Professional Standards Examination',
                examId: 'sample-exam',
            });
            setIsLoading(false);
            return;
        }

        const fetchCertificateData = async () => {
            if (!user || !token || !activeOrg) return;
            setIsLoading(true);
            try {
                const partialData = await googleSheetsService.getCertificateData(token, testId);
                if (partialData && partialData.examId) {
                    const exam = activeOrg.exams.find(e => e.id === partialData.examId);
                    const templateId = exam?.certificateTemplateId || 'cert-completion';
                    const template = activeOrg.certificateTemplates.find(t => t.id === templateId) || activeOrg.certificateTemplates[0];

                    setCertData({
                        ...partialData,
                        organization: activeOrg,
                        template: template,
                        totalQuestions: exam?.numberOfQuestions || 0
                    });
                } else {
                    throw new Error("Record not found.");
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to load certificate.");
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCertificateData();
    }, [testId, user, token, activeOrg, certificateThemeIdFromOrg]);

    const handleDownload = async () => {
        if (!certificatePrintRef.current || !certData) return;
        setIsDownloading(true);
        const toastId = toast.loading('Generating Official Document...');
        try {
            const canvas = await html2canvas(certificatePrintRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
            pdf.save(`Certificate-${certData.candidateName.replace(/\s+/g, '_')}.pdf`);
            toast.dismiss(toastId);
            toast.success("Document issued.");
        } catch(error) {
            toast.dismiss(toastId);
            toast.error("Generation failed.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading || !certData) return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Securely Loading Certificate...</p></div>;

    const { organization, template, examName } = certData;
    const orgKey = organization.id || 'default';
    const orgLogoSrc = localLogos[orgKey] || organization.logoUrl;
    const orgLogoCrossOrigin = orgLogoSrc && !orgLogoSrc.startsWith('data:image') ? "anonymous" : undefined;

    const cleanBody = (body: string) => (body || '')
        .replace(/^this is to certify that/i, '')
        .replace(/^this certifies that/i, '')
        .replace(/<strong>{\s*candidateName\s*}<\/strong>|{\s*candidateName\s*}/gi, '')
        .replace(/{examName}/g, `<strong>${decodeHtmlEntities(examName)}</strong>`)
        .replace(/{finalScore}%/g, `<strong>${certData.finalScore.toFixed(0)}%</strong>`)
        .trim();

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            {isEffectivelyAdmin && testId !== 'sample' && (
                <div className="mb-6 bg-slate-900 border border-slate-700 p-4 rounded-xl text-cyan-400 text-sm font-black flex items-center gap-3 shadow-xl">
                    <Shield size={20}/> AUDIT CONTEXT: VIEWING ISSUED CREDENTIAL FOR UID {certData.candidateName.toUpperCase()}
                </div>
            )}
            
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-50 transition border border-slate-200"><ArrowLeft size={16}/> Return</button>
                <div className="flex gap-3">
                     <button onClick={handleDownload} disabled={isDownloading} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-2xl hover:bg-slate-800 transition disabled:opacity-50"><Download size={16}/> {isDownloading ? 'Engraving...' : 'Download Official PDF'}</button>
                </div>
            </div>

            <div className="overflow-x-auto pb-10">
                <div ref={certificatePrintRef} className="cert-canvas-container">
                    <div className={`cert-frame ${effectiveTheme === 'modern' ? 'cert-frame--modern' : 'cert-frame--classic'}`}>
                        {/* Guilloché Border Overlay */}
                        <div className="cert-border-outer">
                            <div className="cert-border-inner">
                                {/* Watermark for Beta/Sample */}
                                {(isBetaTester || testId === 'sample') && <div className="cert-watermark">{testId === 'sample' ? 'PREVIEW ONLY' : 'BETA COPY'}</div>}
                                
                                <div className="cert-content-wrapper">
                                    <header className="cert-header">
                                        {orgLogoSrc && <img src={orgLogoSrc} crossOrigin={orgLogoCrossOrigin} alt="Logo" className="cert-logo" />}
                                        <h3 className="cert-org-name">{organization.name}</h3>
                                        <div className="cert-header-rule"></div>
                                    </header>

                                    <main className="cert-main">
                                        <h1 className="cert-title">{template.title}</h1>
                                        <p className="cert-statement">This certifies that</p>
                                        <h2 className="cert-candidate">{certData.candidateName}</h2>
                                        <p className="cert-body" dangerouslySetInnerHTML={{ __html: cleanBody(template.body) }} />
                                    </main>

                                    <footer className="cert-footer">
                                        <div className="cert-sig-block">
                                            <div className="cert-sig-line">
                                                {template.signature1ImageUrl && <img src={template.signature1ImageUrl} alt="Signature" className="cert-signature-img" />}
                                            </div>
                                            <p className="cert-sig-name">{template.signature1Name}</p>
                                            <p className="cert-sig-title">{template.signature1Title}</p>
                                        </div>

                                        <div className="cert-seal-block">
                                            <Seal className="cert-seal" />
                                            <div className="cert-meta">
                                                <p>ID: {certData.certificateNumber}</p>
                                                <p>DATE: {certData.date}</p>
                                            </div>
                                        </div>

                                        <div className="cert-sig-block">
                                            <div className="cert-sig-line">
                                                {template.signature2ImageUrl && <img src={template.signature2ImageUrl} alt="Signature" className="cert-signature-img" />}
                                            </div>
                                            <p className="cert-sig-name">{template.signature2Name}</p>
                                            <p className="cert-sig-title">{template.signature2Title}</p>
                                        </div>
                                    </footer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .cert-canvas-container {
                    width: 297mm;
                    height: 210mm;
                    background: #fff;
                    margin: 0 auto;
                    box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25);
                }
                .cert-frame {
                    width: 100%;
                    height: 100%;
                    padding: 12mm;
                    box-sizing: border-box;
                    background: #fff;
                    position: relative;
                }
                .cert-border-outer {
                    width: 100%;
                    height: 100%;
                    border: 8px double #1e293b;
                    padding: 4mm;
                    box-sizing: border-box;
                    position: relative;
                }
                .cert-border-inner {
                    width: 100%;
                    height: 100%;
                    border: 2px solid #cbd5e1;
                    padding: 10mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(to bottom right, #ffffff, #f8fafc);
                }
                .cert-content-wrapper {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    text-align: center;
                }
                .cert-logo {
                    max-height: 25mm;
                    max-width: 60mm;
                    margin: 0 auto 5mm;
                    object-contain: center;
                }
                .cert-org-name {
                    font-family: 'Inter', sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    font-weight: 800;
                    color: #475569;
                    font-size: 14pt;
                    margin-bottom: 5mm;
                }
                .cert-header-rule {
                    width: 40mm;
                    height: 1pt;
                    background: #cbd5e1;
                    margin: 0 auto;
                }
                .cert-main {
                    flex-grow: 1;
                    padding-top: 10mm;
                }
                .cert-title {
                    font-family: 'Source Serif 4', serif;
                    font-size: 42pt;
                    font-weight: 900;
                    color: #0f172a;
                    margin-bottom: 8mm;
                }
                .cert-statement {
                    font-family: 'Source Serif 4', serif;
                    font-style: italic;
                    font-size: 18pt;
                    color: #64748b;
                    margin-bottom: 5mm;
                }
                .cert-candidate {
                    font-family: 'Dancing Script', cursive;
                    font-size: 52pt;
                    color: #1e293b;
                    margin-bottom: 8mm;
                    padding-bottom: 2mm;
                    border-bottom: 1pt solid #e2e8f0;
                    display: inline-block;
                    min-width: 120mm;
                }
                .cert-body {
                    font-family: 'Source Serif 4', serif;
                    font-size: 16pt;
                    line-height: 1.6;
                    color: #334155;
                    max-width: 200mm;
                    margin: 0 auto;
                }
                .cert-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding-bottom: 5mm;
                }
                .cert-sig-block {
                    width: 70mm;
                }
                .cert-sig-line {
                    border-bottom: 1.5pt solid #1e293b;
                    margin-bottom: 3mm;
                    height: 15mm;
                    position: relative;
                }
                .cert-signature-img {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    max-height: 20mm;
                    max-width: 60mm;
                }
                .cert-sig-name {
                    font-weight: 800;
                    font-size: 11pt;
                    color: #1e293b;
                    text-transform: uppercase;
                }
                .cert-sig-title {
                    font-size: 9pt;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .cert-seal {
                    width: 32mm;
                    height: 32mm;
                    margin-bottom: 5mm;
                }
                .cert-meta {
                    font-family: monospace;
                    font-size: 8pt;
                    color: #94a3b8;
                    text-transform: uppercase;
                }
                .cert-watermark {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 80pt;
                    font-weight: 900;
                    color: rgba(0,0,0,0.03);
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 100;
                }
            `}</style>
        </div>
    );
};
export default Certificate;