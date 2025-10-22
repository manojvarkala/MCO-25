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
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;

            // --- 1. Add Cover Page using html2canvas for full-page design control ---
            toast.loading('Generating cover page...', { id: toastId });
            const coverElement = document.createElement('div');
            // Force A4 aspect ratio to prevent distortion when scaling image
            coverElement.style.width = `${pageWidth}pt`;
            coverElement.style.height = `${pageHeight}pt`;
            coverElement.innerHTML = chapters[0].content;
            pdfPrintRef.current.appendChild(coverElement);
            
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
            pdfPrintRef.current.innerHTML = ''; // Clean up

            // --- 2. Combine all other content into a single HTML block for flowing pages ---
            toast.loading('Processing content chapters...', { id: toastId });
            
            const contentHtml = chapters.slice(1).map(chapter => chapter.content).join('');
            const contentContainer = document.createElement('div');
            // This special class uses print-friendly styles (black text on white bg)
            contentContainer.className = 'handbook-pdf-content'; 
            contentContainer.innerHTML = contentHtml;
            pdfPrintRef.current.appendChild(contentContainer);
            
            // pdf.html() will start on a new page and auto-paginate the content
            await pdf.html(contentContainer, {
                x: margin,
                y: margin,
                width: pageWidth - (margin * 2),
                windowWidth: pageWidth - (margin * 2),
                autoPaging: 'text',
            });

            // --- 3. Add Page Numbers after rendering is complete ---
            toast.loading('Finalizing document...', { id: toastId });
            const pageCount = pdf.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor('#999'); // Set a light gray for page numbers
            for (let i = 2; i <= pageCount; i++) { // Start numbering after the cover page
                pdf.setPage(i);
                pdf.text(`Page ${i - 1} of ${pageCount - 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
            }
            
            pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (pdfPrintRef.current) {
                pdfPrintRef.current.innerHTML = ''; // Final cleanup
            }
        }
    };


    return (
        <div className="space-y-8">
            {/* Hidden div for PDF printing, with a fixed width for layout calculation */}
            <div 
                ref={pdfPrintRef} 
                className="fixed -left-[9999px] top-0" 
                style={{ width: '595pt', backgroundColor: 'white', color: 'black' }}
            ></div>

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