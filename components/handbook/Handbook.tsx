
import React, { FC, useState, useRef } from 'react';
import { chapters } from './chapters.ts';
import { BookOpen, Download, List } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
// FIX: Import 'html2canvas' to resolve 'Cannot find name' errors.
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext.tsx';

const Handbook: FC = () => {
    const { activeOrg } = useAppContext();
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

            // --- Add Cover Page ---
            toast.loading('Generating cover page...', { id: toastId });
            pdfPrintRef.current.innerHTML = chapters[0].content;
            const coverCanvas = await html2canvas(pdfPrintRef.current, { scale: 2 });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);

            // --- Add Title Page ---
            toast.loading('Generating title page...', { id: toastId });
            pdf.addPage();
            pdfPrintRef.current.innerHTML = chapters[1].content;
            const titleCanvas = await html2canvas(pdfPrintRef.current, { scale: 2 });
            pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);

            // --- Add Table of Contents ---
            toast.loading('Generating Table of Contents...', { id: toastId });
            pdf.addPage();
            pdfPrintRef.current.innerHTML = chapters[2].content;
            await pdf.html(pdfPrintRef.current, {
                x: margin,
                y: margin,
                width: contentWidth,
                windowWidth: contentWidth,
                autoPaging: 'text',
                margin: [0, 0, 0, 0],
                callback: (doc) => {
                    // We'll add page numbers later
                }
            });

            // --- Add Content Chapters ---
            for (let i = 3; i < chapters.length; i++) {
                const chapter = chapters[i];
                toast.loading(`Processing Chapter ${i-2}: ${chapter.title}`, { id: toastId });
                pdf.addPage();
                pdfPrintRef.current.innerHTML = `<div class="prose max-w-none">${chapter.content}</div>`;
                
                // Add chapter title manually for better formatting control
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(22);
                pdf.text(chapter.title, margin, margin);
                
                await pdf.html(pdfPrintRef.current, {
                    x: margin,
                    y: margin + 40, // Start content below the title
                    width: contentWidth,
                    windowWidth: contentWidth,
                    autoPaging: 'text',
                    margin: [margin, margin, margin, margin],
                });
            }

            // --- Add Page Numbers ---
            toast.loading('Finalizing document...', { id: toastId });
            const pageCount = pdf.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            for (let i = 2; i <= pageCount; i++) { // Start numbering after cover
                pdf.setPage(i);
                pdf.text(`Page ${i - 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
            }
            
            pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (pdfPrintRef.current) pdfPrintRef.current.innerHTML = '';
        }
    };


    return (
        <div className="space-y-8">
            {/* Hidden div for PDF printing, sized for A4 ratio */}
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0 bg-white text-black" style={{ width: '595pt', padding: '40pt' }}></div>

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
                <div className="prose max-w-none prose-invert prose-headings:text-cyan-400 prose-a:text-cyan-400 hover:prose-a:text-cyan-300 prose-strong:text-white">
                    {chapters.slice(2).map((chapter, index) => (
                        <section key={index} dangerouslySetInnerHTML={{ __html: chapter.content }} />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Handbook;
