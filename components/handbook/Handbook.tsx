import React, { FC, useState, useRef, useEffect, useCallback } from 'react';
import { chapters } from './chapters';
import { BookOpen, Download, ChevronLeft, ChevronRight, List } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const pdfPrintRef = useRef<HTMLDivElement>(null);

    const activeChapter = chapters[activeChapterIndex];

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeChapterIndex]);

    const goToChapter = (index: number) => {
        setActiveChapterIndex(index);
        if (window.innerWidth < 1024) { // Close TOC on mobile after selection
            setIsTocOpen(false);
        }
    };

    const generatePdf = useCallback(async () => {
        if (!pdfPrintRef.current) return;
        
        setIsGeneratingPdf(true);
        const toastId = toast.loading('Preparing handbook for download...');

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4',
            });
            const a4Width = pdf.internal.pageSize.getWidth();
            const a4Height = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                toast.loading(`Processing page ${i + 1} of ${chapters.length}: ${chapter.title}`, { id: toastId });
                
                if (pdfPrintRef.current) {
                    // FIX: The content is HTML, so it should be set via innerHTML. The prose class adds styling.
                    pdfPrintRef.current.innerHTML = `<div class="prose max-w-none">${chapter.content}</div>`;
                }
                
                const canvas = await html2canvas(pdfPrintRef.current, {
                    scale: 2,
                    useCORS: true,
                    // FIX: Set width and height to capture the full content of the chapter, not the window size.
                    width: pdfPrintRef.current.scrollWidth,
                    height: pdfPrintRef.current.scrollHeight,
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                
                const ratio = imgWidth / imgHeight;
                let finalWidth = a4Width;
                let finalHeight = a4Width / ratio;
                
                if (finalHeight > a4Height) {
                    finalHeight = a4Height;
                    finalWidth = a4Height * ratio;
                }
                
                const x = (a4Width - finalWidth) / 2;
                const y = (a4Height - finalHeight) / 2;
                
                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

                // Add footer with page number
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(`Page ${i + 1}`, a4Width / 2, a4Height - 10, { align: 'center' });
            }

            pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (pdfPrintRef.current) {
                pdfPrintRef.current.innerHTML = '';
            }
        }
    }, []);

    return (
        <div className="space-y-8">
            {/* Hidden div for PDF printing */}
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0 p-8 bg-white text-slate-800 font-main" style={{ width: '8.5in', minHeight: '11in' }}></div>

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

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Table of Contents */}
                <aside className={`lg:w-1/4 xl:w-1/5 flex-shrink-0 ${isTocOpen ? 'block' : 'hidden'} lg:block`}>
                    <div className="sticky top-28 bg-[rgb(var(--color-card-rgb))] p-4 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                        <h2 className="font-bold text-lg mb-2">Contents</h2>
                        <ul className="space-y-1 text-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
                            {chapters.map((chapter, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => goToChapter(index)}
                                        className={`w-full text-left p-2 rounded transition-colors ${activeChapterIndex === index ? 'bg-[rgba(var(--color-primary-rgb),0.1)] text-[rgb(var(--color-primary-rgb))] font-semibold' : 'hover:bg-[rgb(var(--color-muted-rgb))]'}`}
                                    >
                                        {chapter.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main ref={contentRef} className="flex-grow bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] p-8 overflow-y-auto" style={{ height: 'calc(100vh - 10rem)' }}>
                    <div className="prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: activeChapter.content }} />
                </main>
            </div>

             {/* Mobile/Tablet Controls */}
            <div className="fixed bottom-4 right-4 lg:hidden z-40 flex flex-col gap-2">
                <button onClick={() => setIsTocOpen(!isTocOpen)} className="p-3 bg-cyan-600 text-white rounded-full shadow-lg">
                    <List size={24} />
                </button>
            </div>

            <div className="fixed bottom-4 inset-x-0 flex justify-center lg:hidden z-30">
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-full shadow-lg">
                    <button
                        onClick={() => setActiveChapterIndex(prev => Math.max(0, prev - 1))}
                        disabled={activeChapterIndex === 0}
                        className="p-3 text-white rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-white text-sm font-semibold w-20 text-center">
                        {activeChapterIndex + 1} / {chapters.length}
                    </span>
                    <button
                        onClick={() => setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1))}
                        disabled={activeChapterIndex === chapters.length - 1}
                        className="p-3 text-white rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Handbook;
