import React, { FC, useState, useRef, useEffect } from 'react';
import { chapters } from './chapters.ts';
import { BookOpen, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(1); // Start at Title Page
    const pdfPrintRef = useRef<HTMLDivElement>(null);
    const rightPageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (rightPageRef.current) {
            rightPageRef.current.scrollTop = 0;
        }
    }, [activeChapterIndex]);

    const generatePdf = async () => {
        if (!pdfPrintRef.current) return;

        setIsGeneratingPdf(true);
        const toastId = toast.loading('Initializing PDF generator...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pageWidth - (margin * 2);

            const renderContainer = pdfPrintRef.current;
            renderContainer.innerHTML = '';

            // Step 1: Render Cover Page
            toast.loading('Step 1/5: Generating cover page...', { id: toastId });
            const coverElement = document.createElement('div');
            coverElement.style.width = `${pageWidth}pt`;
            coverElement.style.height = `${pageHeight}pt`;
            coverElement.innerHTML = chapters[0].content;
            renderContainer.appendChild(coverElement);
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
            renderContainer.removeChild(coverElement);

            // Step 2: Loop through content chapters, adding a new page for each
            for (let i = 1; i < chapters.length; i++) {
                toast.loading(`Step ${i + 1}/${chapters.length + 1}: Processing Chapter "${chapters[i].title}"...`, { id: toastId });
                pdf.addPage();
                const chapterElement = document.createElement('div');
                chapterElement.className = 'handbook-pdf-content';
                chapterElement.innerHTML = `<div style="padding: ${margin}pt;">${chapters[i].content}</div>`;
                renderContainer.appendChild(chapterElement);
                
                await pdf.html(chapterElement, {
                    callback: () => {},
                    x: 0,
                    y: 0,
                    width: pageWidth,
                    windowWidth: contentWidth + (margin * 2),
                    autoPaging: 'text'
                });
                renderContainer.innerHTML = '';
            }
            // Remove the blank page added at the start of the loop
            pdf.deletePage(2);
            

            // Step 3: Add Page Numbers
            toast.loading(`Step ${chapters.length + 1}/${chapters.length + 1}: Finalizing document...`, { id: toastId });
            const pageCount = pdf.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor('#64748b'); // slate-500
            for (let i = 2; i <= pageCount; i++) { // Skip cover page
                pdf.setPage(i);
                const pageNumText = `Page ${i - 1} of ${pageCount - 1}`;
                pdf.text(pageNumText, pageWidth / 2, pageHeight - 20, { align: 'center' });
            }
            
            pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    const handleTocClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        const chapterIndexStr = link?.dataset.chapterIndex;
        if (chapterIndexStr) {
            e.preventDefault();
            const newIndex = parseInt(chapterIndexStr, 10);
            if (!isNaN(newIndex)) {
                setActiveChapterIndex(newIndex);
            }
        }
    };

    const handlePrev = () => setActiveChapterIndex(prev => Math.max(1, prev - 1));
    const handleNext = () => setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1));

    const tocContent = chapters[2].content;

    return (
        <div className="space-y-4">
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0"></div>

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

            <div className="flipbook-container">
                <div className="flipbook-spread">
                    <div className="flipbook-spine"></div>
                    <div className="flipbook-page" onClick={handleTocClick}>
                        <div className="handbook-content" dangerouslySetInnerHTML={{ __html: tocContent }} />
                    </div>
                    <div className="flipbook-page" ref={rightPageRef}>
                        <div className="handbook-content" dangerouslySetInnerHTML={{ __html: chapters[activeChapterIndex].content }} />
                    </div>
                </div>
                <div className="flipbook-nav">
                    <button onClick={handlePrev} disabled={activeChapterIndex <= 1}><ChevronLeft size={16} className="inline"/> Previous</button>
                    <span>{chapters[activeChapterIndex].title}</span>
                    <button onClick={handleNext} disabled={activeChapterIndex >= chapters.length - 1}>Next <ChevronRight size={16} className="inline"/></button>
                </div>
            </div>
        </div>
    );
};

export default Handbook;