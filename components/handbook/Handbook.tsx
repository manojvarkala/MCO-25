import React, { FC, useState, useEffect, useRef } from 'react';
import { chapters } from './chapters';
import { ChevronLeft, ChevronRight, BookOpen, Download } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Spinner from '../Spinner';

const Handbook: FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfRenderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hash = location.hash;
        if (hash && hash.startsWith('#page/')) {
            const pageNum = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < chapters.length) {
                // Ensure we start on an even page (left side of the book)
                setCurrentPageIndex(pageNum % 2 === 0 ? pageNum : pageNum - 1);
            }
        } else {
            setCurrentPageIndex(0); // Default to cover page
        }
    }, [location.hash]);

    const navigateToPage = (index: number) => {
        const newIndex = Math.max(0, Math.min(chapters.length - 2, index));
        // Always land on a left page (even index)
        const finalIndex = newIndex % 2 === 0 ? newIndex : newIndex - 1;
        setCurrentPageIndex(finalIndex);
        navigate(`#page/${finalIndex}`);
    };

    const handleTocClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLAnchorElement;
        if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#page/')) {
            e.preventDefault();
            const pageIndex = parseInt(target.getAttribute('href')!.replace('#page/', ''), 10);
            if (!isNaN(pageIndex)) {
                navigateToPage(pageIndex);
            }
        }
    };

    const handleDownload = async () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        const toastId = toast.loading('Generating your handbook PDF...');

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                if (pdfRenderRef.current) {
                    // Render chapter content into the offscreen div
                    pdfRenderRef.current.innerHTML = chapter.content;
                    
                    const canvas = await html2canvas(pdfRenderRef.current, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = imgWidth / imgHeight;
                    const imgPdfWidth = pdfWidth;
                    const imgPdfHeight = pdfWidth / ratio;
                    
                    if (i > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'PNG', 0, 0, imgPdfWidth, imgPdfHeight);
                }
            }

            pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
            toast.success('Handbook PDF downloaded successfully!', { id: toastId });

        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (pdfRenderRef.current) {
                pdfRenderRef.current.innerHTML = '';
            }
        }
    };

    const leftPage = chapters[currentPageIndex];
    const rightPage = currentPageIndex + 1 < chapters.length ? chapters[currentPageIndex + 1] : null;

    if (!leftPage) {
        return <div>Chapter not found.</div>;
    }
    
    // The TOC is a special case for rendering
    const isTocVisible = leftPage.title === "Table of Contents" || (rightPage && rightPage.title === "Table of Contents");

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-600 font-display flex items-center gap-3">
                    <BookOpen />
                    Technical Handbook
                </h1>
                <button
                    onClick={handleDownload}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-slate-400"
                >
                    {isGeneratingPdf ? <Spinner /> : <Download size={16} />}
                    {isGeneratingPdf ? 'Generating...' : 'Download as PDF'}
                </button>
            </div>
            
            <div className="aspect-[2/1.4] bg-[rgb(var(--color-card-rgb))] p-4 sm:p-6 rounded-lg shadow-2xl border border-[rgb(var(--color-border-rgb))]">
                <div className="h-full w-full flex gap-4 sm:gap-6">
                    {/* Left Page */}
                    <div 
                        className={`w-1/2 h-full bg-white rounded-l-md shadow-inner overflow-y-auto ${leftPage.isCover ? 'p-0' : 'p-6 sm:p-8'} handbook-page`}
                        onClick={isTocVisible ? handleTocClick : undefined}
                        dangerouslySetInnerHTML={{ __html: leftPage.content }}
                    />

                    {/* Right Page */}
                    <div 
                        className="w-1/2 h-full bg-white rounded-r-md shadow-inner overflow-y-auto p-6 sm:p-8 handbook-page"
                        onClick={isTocVisible ? handleTocClick : undefined}
                        dangerouslySetInnerHTML={{ __html: rightPage ? rightPage.content : '' }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigateToPage(currentPageIndex - 2)}
                    disabled={currentPageIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-muted-rgb))] rounded-lg font-semibold hover:bg-[rgb(var(--color-border-rgb))] disabled:opacity-50"
                >
                    <ChevronLeft /> Previous
                </button>
                <div className="text-sm text-[rgb(var(--color-text-muted-rgb))]">
                    Page {currentPageIndex + 1} {rightPage ? `- ${currentPageIndex + 2}` : ''} of {chapters.length}
                </div>
                <button
                    onClick={() => navigateToPage(currentPageIndex + 2)}
                    disabled={!rightPage || currentPageIndex + 2 >= chapters.length}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-muted-rgb))] rounded-lg font-semibold hover:bg-[rgb(var(--color-border-rgb))] disabled:opacity-50"
                >
                    Next <ChevronRight />
                </button>
            </div>
            
            {/* Offscreen div for PDF rendering */}
            <div ref={pdfRenderRef} className="fixed -left-[9999px] top-0 p-8 handbook-page" style={{ width: '600px', background: 'white' }}></div>

             <style>{`
                .handbook-page { font-family: 'Inter', sans-serif; color: #334155; }
                .handbook-page h1, .handbook-page h2, .handbook-page h3, .handbook-page h4 { font-family: 'Source Serif 4', serif; color: #1e293b; font-weight: 700; margin-bottom: 0.75rem; }
                .handbook-page h1 { font-size: 2.5rem; }
                .handbook-page h2 { font-size: 1.75rem; margin-top: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
                .handbook-page h3 { font-size: 1.25rem; color: #0891b2; margin-top: 1.5rem; }
                .handbook-page p { margin-bottom: 1rem; line-height: 1.6; }
                .handbook-page ul, .handbook-page ol { margin-left: 1.5rem; margin-bottom: 1rem; }
                .handbook-page li { margin-bottom: 0.5rem; }
                .handbook-page a { color: #0891b2; text-decoration: none; }
                .handbook-page a:hover { text-decoration: underline; }
                .handbook-page pre { background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; font-family: monospace; white-space: pre-wrap; word-break: break-all; margin: 1rem 0;}
                .handbook-page code { font-size: 0.875rem; }
                .handbook-page .is-cover { padding: 0 !important; }
                .handbook-toc a { display: block; }
            `}</style>
        </div>
    );
};

export default Handbook;
