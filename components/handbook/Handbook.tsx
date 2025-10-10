import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { chapters, Chapter } from './chapters.ts';
import Spinner from '../Spinner.tsx';

const Handbook: FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState<false | 'forward' | 'backward'>(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const totalPageSpreads = Math.ceil(chapters.length / 2);

    useEffect(() => {
        const hash = location.hash;
        if (hash && hash.startsWith('#page/')) {
            const pageNum = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < totalPageSpreads) {
                setCurrentPageIndex(pageNum);
            }
        }
    }, []);

    const handleNavigate = useCallback((direction: 'forward' | 'backward' | number) => {
        if (isAnimating) return;

        let newPageIndex = currentPageIndex;
        if (typeof direction === 'number') {
            newPageIndex = Math.floor(direction / 2);
        } else if (direction === 'forward') {
            newPageIndex = Math.min(totalPageSpreads - 1, currentPageIndex + 1);
        } else {
            newPageIndex = Math.max(0, currentPageIndex - 1);
        }

        if (newPageIndex !== currentPageIndex) {
            const animationDirection = newPageIndex > currentPageIndex ? 'forward' : 'backward';
            setIsAnimating(animationDirection);
            setTimeout(() => {
                setCurrentPageIndex(newPageIndex);
                navigate(`#page/${newPageIndex}`);
                setIsAnimating(false);
            }, 500);
        } else {
             navigate(`#page/${newPageIndex}`);
        }
    }, [isAnimating, currentPageIndex, totalPageSpreads, navigate]);

    const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'A' || window.getSelection()?.toString()) {
            const href = target.getAttribute('href');
            if (href && href.startsWith('#page/')) {
                e.preventDefault();
                const pageNum = parseInt(href.replace('#page/', ''), 10);
                if (!isNaN(pageNum)) {
                    handleNavigate(pageNum);
                }
            }
            return;
        }

        const book = e.currentTarget;
        const rect = book.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX > book.offsetWidth / 2) {
            handleNavigate('forward');
        } else {
            handleNavigate('backward');
        }
    };
    
    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Generating your handbook PDF... This may take a moment.');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // 1. Cover Page
            const coverElement = document.getElementById('handbook-cover-page-render-source');
            if (coverElement) {
                const canvas = await html2canvas(coverElement, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            }

            // Recursive function to process chapters sequentially
            const processChapter = async (index: number) => {
                if (index >= chapters.length) {
                    // All chapters done, add page numbers and save
                    const totalPages = pdf.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(8);
                        pdf.setTextColor(150);
                        if (i > 2) { // No numbers on cover/back
                            pdf.text(`Page ${i - 2}`, pageWidth - 40, pageHeight - 20);
                        }
                    }
                    pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
                    toast.success('Handbook PDF downloaded!', { id: toastId });
                    setIsDownloading(false);
                    return;
                }

                const chapter = chapters[index];
                
                if (index === 1) { // Blank page after cover
                    pdf.addPage();
                }
                
                if (index > 1) { // Chapters start on odd pages
                    if (pdf.getNumberOfPages() % 2 === 0) {
                        pdf.addPage();
                    }
                    pdf.addPage();
                }

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chapter.content;
                tempDiv.className = 'prose max-w-none prose-slate bg-white p-8';
                tempDiv.style.width = `${pageWidth}px`;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);
                
                await pdf.html(tempDiv, {
                    callback: (doc) => {
                        document.body.removeChild(tempDiv);
                        processChapter(index + 1); // Process next chapter
                    },
                    autoPaging: 'text',
                    margin: [40, 40, 40, 40],
                    width: pageWidth - 80,
                    windowWidth: pageWidth - 80,
                });
            };

            // Start processing from the Title Page (index 1)
            await processChapter(1);
            
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF.', { id: toastId });
            setIsDownloading(false);
        }
    };
    
    const leftChapterIndex = currentPageIndex * 2;
    const rightChapterIndex = currentPageIndex * 2 + 1;
    const leftChapter = chapters[leftChapterIndex];
    const rightChapter = chapters[rightChapterIndex];
    
    const leftPageClass = isAnimating === 'backward' ? 'animate-page-flip-backward' : '';
    const rightPageClass = isAnimating === 'forward' ? 'animate-page-flip-forward' : '';

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-2 sm:p-4 rounded-xl shadow-inner">
            <div className="flex flex-wrap justify-between items-center mb-4 px-2 sm:px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))] flex items-center gap-2">
                    <span className="bg-gradient-to-r from-cyan-500 to-purple-500 text-transparent bg-clip-text">
                        Technical Handbook
                    </span>
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold text-slate-700"
                    >
                        {isDownloading ? <Spinner size="sm"/> : <Download size={16} />}
                        {isDownloading ? 'Generating...' : 'Download as PDF'}
                    </button>
                    <button onClick={() => handleNavigate('backward')} disabled={!!isAnimating || currentPageIndex === 0} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-semibold text-slate-600">Page {currentPageIndex + 1} of {totalPageSpreads}</span>
                    <button onClick={() => handleNavigate('forward')} disabled={!!isAnimating || currentPageIndex === totalPageSpreads - 1} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto aspect-[17/11] perspective" onClick={handlePageClick}>
                <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                    <div className={`bg-white shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden relative ${leftPageClass} backface-hidden`}>
                        {leftChapter && (
                            <div className="p-8 sm:p-12 h-full overflow-hidden prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: leftChapter.content }} />
                        )}
                    </div>
                    <div className={`bg-white shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden relative ${rightPageClass} backface-hidden`}>
                        {rightChapter ? (
                             <div className="p-8 sm:p-12 h-full overflow-hidden prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: rightChapter.content }} />
                        ) : (
                            <div className="p-8 sm:p-12"></div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Hidden element for rendering the cover for PDF generation */}
            <div id="handbook-cover-page-render-source" className="prose max-w-none prose-slate" style={{ width: '595pt', height: '842pt', position: 'absolute', left: '-9999px', top: 0 }}>
                <div dangerouslySetInnerHTML={{ __html: chapters[0].content }} style={{ height: '100%' }} />
            </div>

            <style>{`.handbook-toc a { text-decoration: none; color: inherit; } .handbook-toc a:hover { color: rgb(var(--color-primary-rgb)); text-decoration: underline; }`}</style>
        </div>
    );
};

export default Handbook;