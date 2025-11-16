import React, { FC, useState, useRef, useEffect } from 'react';
import { BookOpen, Download } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { chapters as allChaptersData } from './chapters.ts';

// Helper to extract the ID from a chapter's content
const getIdFromHtml = (html: string): string | null => {
    const match = html.match(/id="([^"]+)"/);
    return match ? match[1] : null;
};

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterId, setActiveChapterId] = useState('');
    const pdfPrintRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const chapterRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    const chaptersForDisplay = allChaptersData.filter(c => !c.isCover);
    const tocChapters = chaptersForDisplay.filter(c => !c.isTitlePage && !c.isToc);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveChapterId(entry.target.id);
                    }
                });
            },
            { root: contentRef.current, rootMargin: "0px 0px -80% 0px", threshold: 0 }
        );

        Object.values(chapterRefs.current).forEach(el => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [chaptersForDisplay]);
    
    const generatePdf = async () => {
        if (!pdfPrintRef.current) return;

        setIsGeneratingPdf(true);
        const toastId = toast.loading('Initializing PDF generator...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pageWidth - margin * 2;
            
            // --- Cover Page ---
            toast.loading('Step 1/3: Generating cover page...', { id: toastId });
            const coverContent = allChaptersData.find(c => c.isCover)?.content;
            if (coverContent) {
                const coverContainer = document.createElement('div');
                coverContainer.className = 'handbook-pdf-cover-container';
                coverContainer.innerHTML = coverContent;
                pdfPrintRef.current.appendChild(coverContainer);
                const coverCanvas = await html2canvas(coverContainer, { scale: 2, useCORS: true });
                pdf.addImage(coverCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageWidth, pageHeight);
                pdfPrintRef.current.innerHTML = '';
            }

            // --- Main Content & TOC ---
            toast.loading('Step 2/3: Rendering handbook content...', { id: toastId });
            pdf.addPage();
            
            const fullHtmlContent = chaptersForDisplay.map(c => c.content).join('<div style="page-break-before: always;"></div>');
            const contentContainer = document.createElement('div');
            contentContainer.className = 'handbook-pdf-content';
            contentContainer.style.width = `${contentWidth}pt`;
            contentContainer.innerHTML = fullHtmlContent;
            pdfPrintRef.current.appendChild(contentContainer);
            
            await pdf.html(contentContainer, {
                callback: (doc) => {
                    if(pdfPrintRef.current) pdfPrintRef.current.innerHTML = ''; // Clean up DOM
                    return doc;
                },
                margin: [margin, margin, margin, margin],
                autoPaging: 'text',
                html2canvas: { scale: 0.75, useCORS: true }
            });
            
            toast.loading('Step 3/3: Adding headers and footers...', { id: toastId });
            const pageCount = pdf.getNumberOfPages();
            for (let i = 2; i <= pageCount; i++) { 
                pdf.setPage(i);
                const pageNumText = `Page ${i - 1}`;
                const headerText = "Annapoorna Infotech Examination Engine Handbook";
                pdf.setFontSize(8);
                pdf.setTextColor('#64748b');
                pdf.text(headerText, margin, margin / 2);
                pdf.text(pageNumText, pageWidth - margin, pageHeight - margin / 2, { align: 'right' });
            }
            
            pdf.save('Annapoorna_Infotech_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (pdfPrintRef.current) pdfPrintRef.current.innerHTML = '';
        }
    };
    
    const handleTocClick = (e: React.MouseEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.hash) {
            e.preventDefault();
            const targetId = link.hash.substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };
    
    const tocContentForSidebar = allChaptersData.find(c => c.isToc)?.content || '';

    return (
        <div className="space-y-4">
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0" aria-hidden="true"></div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                        <BookOpen /> Administrator Handbook
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mt-2">A comprehensive guide to the Examination Engine.</p>
                </div>
                <button
                    onClick={generatePdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-slate-400"
                >
                    {isGeneratingPdf ? <Spinner /> : <Download size={18} />}
                    {isGeneratingPdf ? 'Generating...' : 'Download as PDF'}
                </button>
            </div>

            <div className="ebook-container" onClick={handleTocClick}>
                <aside className="ebook-toc-sidebar">
                    <nav>
                         <div dangerouslySetInnerHTML={{ __html: tocContentForSidebar.replace(/<h2.*?>.*?<\/h2>/, '') }} />
                    </nav>
                </aside>
                <main className="ebook-content-main" ref={contentRef}>
                    {chaptersForDisplay.map((chapter) => {
                        const id = getIdFromHtml(chapter.content);
                        if (!id) return null;
                        return (
                            <section 
                                key={id} 
                                id={id} 
                                ref={(el) => { chapterRefs.current[id] = el; }} 
                                className="handbook-chapter"
                                aria-labelledby={id}
                            >
                                <div className="handbook-content" dangerouslySetInnerHTML={{ __html: chapter.content }} />
                            </section>
                        )
                    })}
                </main>
            </div>
        </div>
    );
};

export default Handbook;