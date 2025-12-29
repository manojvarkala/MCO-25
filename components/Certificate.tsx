

import React, { FC, useState, useEffect, useRef } from 'react';
// FIX: Standardize react-router-dom import to use double quotes to resolve module export errors.
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
// FIX: Import localLogos as a map
import { localLogos } from '../assets/localLogos.ts';

const decodeHtmlEntities = (text: string | undefined): string => {
    if (!text || typeof text !== 'string') return text || '';
    try {
        const textarea = document.createElement('div');
        textarea.innerHTML = text;
        return textarea.textContent || textarea.innerText || '';
    } catch (e) {
        console.error("Could not decode HTML entities", e);
        return text;
    }
};

const Certificate: FC = () => {
    const { testId = 'sample' } = useParams<{ testId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, token, isEffectivelyAdmin, isBetaTester } = useAuth();
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
                navigate('/dashboard');
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
    }, [testId, user, token, navigate, activeOrg, isEffectivelyAdmin, location.search, certificateThemeIdFromOrg]);

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

    // FIX: Prioritize local base64 logo for PDF rendering, fall back to external URL
    const orgLogoSrc = localLogos[organization.id] || organization.logoUrl;
    // Determine if crossOrigin is needed (only for external URLs, not base64)
    const orgLogoCrossOrigin = orgLogoSrc && !orgLogoSrc.startsWith('data:image') ? "anonymous" : undefined;

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
                                {orgLogoSrc && ( // FIX: Use orgLogoSrc for dynamic source
                                    <img src={orgLogoSrc} crossOrigin={orgLogoCrossOrigin} alt={`${organization.name} Logo`} className="cert-logo" />
                                )}
                                <div className="cert-brain-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
                                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 9.5 7v0A2.5 2.5 0 0 1 7 4.5v0A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 1 17 