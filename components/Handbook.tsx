import React, { FC, useState, useRef } from 'react';
import { chapters } from './handbook/chapters.ts';
import { BookOpen, Download } from 'lucide-react';
import Spinner from './Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfPrintRef = useRef<HTMLDivElement>(null);

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

            // This container will be used to render each section before adding it to the PDF
            const renderContainer = pdfPrintRef.current;
            renderContainer.innerHTML = ''; // Clear previous content

            // --- 1. Render Cover Page (as a full-page image) ---
            toast.loading('Step 1/4: Generating cover page...', { id: toastId });
            const coverElement = document.createElement('div');
            coverElement.style.width = `${pageWidth}pt`;
            coverElement.style.height = `${pageHeight}pt`;
            coverElement.innerHTML = chapters[0].content; // cover.ts
            renderContainer.appendChild(coverElement);
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
            renderContainer.removeChild(coverElement);

            // --- 2. Render Title Page (as HTML) ---
            toast.loading('Step 2/4: Adding title page and TOC...', { id: toastId });
            pdf.addPage();
            const titlePageElement = document.createElement('div');
            titlePageElement.className = 'handbook-pdf-content';
            titlePageElement.innerHTML = chapters[1].content; // titlePage.ts
            renderContainer.appendChild(titlePageElement);
            await pdf.html(titlePageElement, { x: margin, y: margin, width: contentWidth, windowWidth: contentWidth });
            renderContainer.removeChild(titlePageElement);
            
            // --- 3. Render Table of Contents (as HTML) ---
            pdf.addPage();
            const tocElement = document.createElement('div');
            tocElement.className = 'handbook-pdf-content';
            tocElement.innerHTML = chapters[2].content; // toc.ts
            renderContainer.appendChild(tocElement);
            await pdf.html(tocElement, { x: margin, y: margin, width: contentWidth, windowWidth: contentWidth });
            renderContainer.removeChild(tocElement);

            // --- 4. Render all content chapters sequentially ---
            for (let i = 3; i < chapters.length; i++) {
                toast.loading(`Step 3/4: Processing chapter ${i-2} of ${chapters.length-3}...`, { id: toastId });
                pdf.addPage();
                const chapterElement = document.createElement('div');
                chapterElement.className = 'handbook-pdf-content';
                chapterElement.innerHTML = chapters[i].content;
                renderContainer.appendChild(chapterElement);
                await pdf.html(chapterElement, {
                    x: margin, y: margin,
                    width: contentWidth,
                    windowWidth: contentWidth,
                    autoPaging: 'text',
                });
                renderContainer.removeChild(chapterElement);
            }

            // --- 5. Add Page Numbers ---
            toast.loading('Step 4/4: Finalizing document...', { id: toastId });
            const pageCount = pdf.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor('#64748b'); // slate-500
            for (let i = 2; i <= pageCount; i++) { // Start after cover page
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

    return (
        <div className="space-y-8">
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0" style={{ width: '595pt' }}></div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                        <BookOpen /> Administrator Handbook
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mt-2">
                        A comprehensive guide to the Annapoorna Examination Engine.
                    </p>
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

            <main className="space-y-8">
                {/* Render Cover Separately */}
                <div className="handbook-cover-preview rounded-xl shadow-lg overflow-hidden" dangerouslySetInnerHTML={{ __html: chapters[0].content }} />

                {/* Render Rest of the Content */}
                <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] p-8 lg:p-12">
                    <div className="handbook-content max-w-none">
                        {chapters.slice(1).map((chapter, index) => (
                            <section key={index} dangerouslySetInnerHTML={{ __html: chapter.content }} />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Handbook;