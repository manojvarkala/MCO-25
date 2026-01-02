
import React, { FC, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { CertificateData } from '../types.ts';
import LogoSpinner from './LogoSpinner.tsx';
import { Download, ArrowLeft } from 'lucide-react';
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
    const { testId = 'sample' } = useParams<{ testId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, token, isBetaTester } = useAuth();
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
            const templateToUse = templateIdFromUrl
                ? activeOrg.certificateTemplates.find(t => t.id === templateIdFromUrl)
                : activeOrg.certificateTemplates.find(t => t.id === 'cert-practice');

            if (!templateToUse) {
                toast.error("Template not found.");
                navigate('/dashboard');
                return;
            }
            
            setEffectiveTheme(themeIdFromUrl || certificateThemeIdFromOrg);
            setCertData({
                certificateNumber: 'SAMPLE-V4-123456',
                candidateName: user.name || 'Sample Candidate',
                finalScore: 95,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                totalQuestions: 100,
                organization: activeOrg,
                template: templateToUse,
                examName: 'Sample Proficiency Exam',
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
                    toast.error("Certificate not found.");
                    navigate('/dashboard');
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to load.");
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
        const toastId = toast.loading('Assembling Certificate PDF...');
        try {
            const canvas = await html2canvas(certificatePrintRef.current, { 
                scale: 3, // High DPI
                useCORS: true, 
                backgroundColor: '#ffffff',
                logging: false
            });
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
            pdf.save(`Certificate-${certData.candidateName.replace(/\s+/g, '_')}.pdf`);
            toast.dismiss(toastId);
            toast.success("Certificate saved to your device!");
        } catch(error) {
            toast.dismiss(toastId);
            toast.error("Could not generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading || !certData) return <div className="flex flex-col items-center justify-center h-64"><LogoSpinner /><p className="mt-4 text-slate-600">Generating Document Preview...</p></div>;

    const { organization, template, examName } = certData;
    const orgKey = organization.id || 'default';
    const orgLogoSrc = localLogos[orgKey] || organization.logoUrl;
    const orgLogoCrossOrigin = orgLogoSrc && !orgLogoSrc.startsWith('data:image') ? "anonymous" : undefined;

    const sanitizeBody = (body: string) => (body || '').replace(/^this is to certify that/i, '').replace(/^this certifies that/i, '').replace(/<strong>{\s*candidateName\s*}<\/strong>|{\s*candidateName\s*}/gi, '').trim();
    const processedBody = sanitizeBody(template.body).replace(/{examName}/g, `<strong>${decodeHtmlEntities(examName)}</strong>`).replace(/{finalScore}%/g, `<strong>${certData.finalScore.toFixed(0)}%</strong>`);

    return (
        <div className="max-w-5xl mx-auto bg-slate-100 p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl font-bold shadow-sm hover:bg-slate-50 transition text-slate-700 border border-slate-200"><ArrowLeft size={18}/> Back</button>
                <button onClick={handleDownload} disabled={isDownloading} className="flex items-center gap-2 px-8 py-2.5 bg-cyan-600 text-white font-bold rounded-xl shadow-lg hover:bg-cyan-700 transition disabled:opacity-50"><Download size={18}/> {isDownloading ? 'Processing...' : 'Download Official PDF'}</button>
            </div>
            
            <div className="overflow-x-auto p-4 bg-slate-200 rounded-xl shadow-inner">
                <div ref={certificatePrintRef} className="cert-base">
                    {isBetaTester && testId !== 'sample' && <div className="watermark-overlay">BETA TESTER SPECIMEN</div>}
                    {effectiveTheme === 'modern' ? (
                        <div className="cert-container-modern">
                            <div className="cert-modern-sidebar">
                                {orgLogoSrc && <img src={orgLogoSrc} crossOrigin={orgLogoCrossOrigin} alt="Logo" className="w-full mb-12" />}
                                <h3 className="font-bold text-xl uppercase tracking-widest border-t border-white/20 pt-8">{organization.name}</h3>
                                <p className="text-xs mt-auto opacity-50 font-mono">{certData.certificateNumber}</p>
                            </div>
                            <div className="cert-main-panel">
                                <h1 className="cert-title-main-modern">{template.title}</h1>
                                <p className="text-2xl text-slate-500 mb-2">Presented to</p>
                                <h2 className="cert-candidate-name-modern">{certData.candidateName}</h2>
                                <p className="text-xl leading-relaxed text-slate-700 max-w-2xl" dangerouslySetInnerHTML={{ __html: processedBody }} />
                                <div className="mt-auto flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification ID</p>
                                        <p className="font-mono text-lg text-slate-800">{certData.certificateNumber}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4">Date Issued</p>
                                        <p className="text-lg font-bold text-slate-800">{certData.date}</p>
                                    </div>
                                    <Seal className="w-40 h-40" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="cert-container-classic">
                            <div className="cert-border-pattern">
                                <div className="cert-border-line">
                                    {orgLogoSrc && <img src={orgLogoSrc} crossOrigin={orgLogoCrossOrigin} alt="Logo" className="h-24 mx-auto mb-10 object-contain" />}
                                    <h1 className="cert-title-main">{template.title}</h1>
                                    <p className="text-2xl mt-8 text-slate-500">This is to certify that</p>
                                    <h2 className="cert-candidate-name">{certData.candidateName}</h2>
                                    <p className="text-2xl max-w-2xl mx-auto leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: processedBody }} />
                                    <div className="mt-auto pt-12 flex justify-between items-end">
                                        <div className="w-1/3 text-center"><p className="font-bold text-xl text-slate-800">{certData.date}</p><div className="cert-hr"></div><p className="text-xs uppercase tracking-widest text-slate-400">Date of Achievement</p></div>
                                        <div className="w-1/3 flex justify-center"><Seal className="w-32 h-32" /></div>
                                        <div className="w-1/3 text-center"><p className="font-bold text-xl text-slate-800 font-mono">{certData.certificateNumber}</p><div className="cert-hr"></div><p className="text-xs uppercase tracking-widest text-slate-400">Certification ID</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-slate-500 text-xs mt-6">Certificates are issued electronically and can be verified using the unique Certification ID at <span className="font-semibold">{organization.website}/verify</span></p>
        </div>
    );
};
export default Certificate;