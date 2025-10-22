import React, { FC, useState, useRef } from 'react';
import { chapters } from './chapters.ts';
import { BookOpen, Download } from 'lucide-react';
import Spinner from '../Spinner.tsx';
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
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 40;
            const contentWidth = pageWidth - (margin * 2);

            // --- 1. Add Cover Page using html2canvas for full-page design control ---
            toast.loading('Generating cover page...', { id: toastId });
            const coverElement = document.createElement('div');
            coverElement.style.width = `${pageWidth}pt`;
            coverElement.style.height = `${pageHeight}pt`;
            coverElement.innerHTML = chapters[0].content;
            pdfPrintRef.current.appendChild(coverElement);
            
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
            pdfPrintRef.current.innerHTML = ''; // Clean up

            // --- 2. Combine all other content into a single HTML block for flowing pages ---
            toast.loading('Processing content chapters...', { id: toastId });
            pdf.addPage();
            
            // We build one large HTML string for jsPDF to paginate automatically.
            const contentHtml = chapters.slice(1).map(chapter => chapter.content).join('<div style="page-break-before: always;"></div>');
            const contentContainer = document.createElement('div');
            // This class matches the on-screen styles for PDF consistency.
            contentContainer.className = 'handbook-content'; 
            contentContainer.innerHTML = contentHtml;
            pdfPrintRef.current.appendChild(contentContainer);
            
            await pdf.html(pdfPrintRef.current, {
                x: margin,
                y: margin,
                width: contentWidth,
                windowWidth: contentWidth,
                autoPaging: 'text',
                callback: (doc) => {
                    // --- 3. Add Page Numbers ---
                    toast.loading('Finalizing document...', { id: toastId });
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    for (let i = 2; i <= pageCount; i++) { // Start numbering after cover page
                        doc.setPage(i);
                        doc.text(`Page ${i - 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
                    }
                    
                    doc.save('Annapoorna_Examination_Engine_Handbook.pdf');
                    toast.success('Handbook downloaded successfully!', { id: toastId });
                    setIsGeneratingPdf(false);
                    if (pdfPrintRef.current) {
                        pdfPrintRef.current.innerHTML = '';
                    }
                }
            });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
            setIsGeneratingPdf(false);
            if (pdfPrintRef.current) {
                pdfPrintRef.current.innerHTML = '';
            }
        }
    };


    return (
        <div className="space-y-8">
            {/* Hidden div for PDF printing */}
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0 bg-white text-slate-800" style={{ width: '595pt' }}></div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                        <BookOpen />
                        Administrator Handbook
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

            <main className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] p-8 lg:p-12">
                <div className="handbook-content max-w-none">
                    {chapters.slice(2).map((chapter, index) => (
                        <section key={index} dangerouslySetInnerHTML={{ __html: chapter.content }} />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Handbook;