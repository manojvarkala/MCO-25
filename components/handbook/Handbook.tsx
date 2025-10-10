import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, BookOpen, Download } from 'lucide-react';
import { chapters, Chapter } from './chapters';
import Spinner from '../Spinner.tsx';

const Handbook: FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentPageIndex, setCurrentPageIndex] = useState(0); // Index for page spreads (2 chapters at a time)
    const [isAnimating, setIsAnimating] = useState<false | 'forward' | 'backward'>(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    const totalPageSpreads = Math.ceil(chapters.length / 2);

    useEffect(() => {
        const hash = location.hash;
        if (hash && hash.startsWith('#page/')) {
            const pageNum = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < totalPageSpreads) {
                setCurrentPageIndex(pageNum);
            }
        }
    }, []); // Run only on initial mount

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
            setIsAnimating(direction === 'forward' ? 'forward' : 'backward');
            setTimeout(() => {
                setCurrentPageIndex(newPageIndex);
                navigate(`#page/${newPageIndex}`);
                setIsAnimating(false);
            }, 500); // Match animation duration
        } else {
             navigate(`#page/${newPageIndex}`);
        }
    }, [isAnimating, currentPageIndex, totalPageSpreads, navigate]);

    const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent page turn if clicking a link in TOC or selecting text
        const target = e.target as HTMLElement;
        if (target.tagName === 'A' || window.getSelection()?.toString()) {
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
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            const contentHeight = pageHeight - (margin * 2);

            let pageCount = 1;
            let isFirstPage = true;

            // Render each chapter to a canvas and add to PDF
            for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                const element = document.createElement('div');
                element.innerHTML = chapter.content;
                element.className = 'prose max-w-none prose-slate bg-white p-8';
                element.style.width = `${contentWidth}px`;
                element.style.position = 'absolute';
                element.style.left = '-9999px';
                document.body.appendChild(element);

                // Handle book layout: blank page after cover, chapters start on right
                if (i === 1) { // Blank page after cover
                    pdf.addPage();
                    pageCount++;
                }
                if (i > 1 && pageCount % 2 === 0) { // Chapters start on odd (right) pages
                     pdf.addPage();
                     pageCount++;
                }

                if (!isFirstPage) {
                    pdf.addPage();
                    pageCount++;
                }
                isFirstPage = false;

                const canvas = await html2canvas(element, {
                    scale: 2,
                    windowWidth: contentWidth,
                });
                document.body.removeChild(element);

                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                
                // Add first page of the chapter content
                pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
                heightLeft -= contentHeight;

                // Add more pages if content overflows
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pageCount++;
                    pdf.addImage(imgData, 'PNG', margin, position + margin, contentWidth, imgHeight);
                    heightLeft -= contentHeight;
                }
            }

            // Add page numbers
            for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                if (i > 1) { // No page number on cover
                   pdf.text(`Page ${i}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                }
            }
            
            pdf.save('Annapoorna_Examination_Engine_Handbook.pdf');
            toast.success('Handbook PDF downloaded!', { id: toastId });
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };
    
    // Determine which chapters to display on the left and right pages
    const leftChapterIndex = currentPageIndex * 2;
    const rightChapterIndex = currentPageIndex * 2 + 1;
    const leftChapter = chapters[leftChapterIndex];
    const rightChapter = chapters[rightChapterIndex];
    
    const leftPageClass = isAnimating === 'backward' ? 'animate-page-flip-backward' : '';
    const rightPageClass = isAnimating === 'forward' ? 'animate-page-flip-forward' : '';

    return (
        <div className="bg-slate-100 p-2 sm:p-4 rounded-xl shadow-inner">
            <div className="flex flex-wrap justify-between items-center mb-4 px-2 sm:px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
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
                    {/* FIX: The 'isAnimating' state can be a string, which is truthy but not a valid boolean for the 'disabled' prop. Coercing to boolean with '!!' resolves the type error. */}
                    <button onClick={() => handleNavigate('backward')} disabled={!!isAnimating || currentPageIndex === 0} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-semibold text-slate-600">Page {currentPageIndex + 1} of {totalPageSpreads}</span>
                    {/* FIX: The 'isAnimating' state can be a string, which is truthy but not a valid boolean for the 'disabled' prop. Coercing to boolean with '!!' resolves the type error. */}
                    <button onClick={() => handleNavigate('forward')} disabled={!!isAnimating || currentPageIndex === totalPageSpreads - 1} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto aspect-[17/11] perspective" onClick={handlePageClick}>
                <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                    {/* Left Page */}
                    <div className={`bg-white shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden ${leftPageClass} backface-hidden`}>
                        {leftChapter && (
                            <div className="p-8 sm:p-12 overflow-y-auto h-full prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: leftChapter.content }} />
                        )}
                    </div>
                    {/* Right Page */}
                    <div className={`bg-white shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden ${rightPageClass} backface-hidden`}>
                        {rightChapter ? (
                             <div className="p-8 sm:p-12 overflow-y-auto h-full prose max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: rightChapter.content }} />
                        ) : (
                            <div className="p-8 sm:p-12"></div>
                        )}
                    </div>
                </div>
            </div>
            {/* FIX: Add missing CSS for page flip animations and 3D transform utility classes. */}
            <style>{`
                .handbook-toc a { text-decoration: none; color: inherit; } 
                .handbook-toc a:hover { color: rgb(var(--color-primary-rgb)); text-decoration: underline; }
                
                /* Page flip animation styles */
                .perspective { perspective: 2000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }

                @keyframes page-flip-forward-anim {
                    from { transform: rotateY(0deg); }
                    to { transform: rotateY(-180deg); }
                }
                .animate-page-flip-forward {
                    animation: page-flip-forward-anim 0.5s ease-in-out forwards;
                    transform-origin: left center;
                }

                @keyframes page-flip-backward-anim {
                    from { transform: rotateY(0deg); }
                    to { transform: rotateY(180deg); }
                }
                .animate-page-flip-backward {
                    animation: page-flip-backward-anim 0.5s ease-in-out forwards;
                    transform-origin: right center;
                }
            `}</style>
        </div>
    );
};

export default Handbook;
