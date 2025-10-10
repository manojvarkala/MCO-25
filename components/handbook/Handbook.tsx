import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { chapters as initialChapters, Chapter } from './chapters.ts';
import Spinner from '../Spinner.tsx';

interface PageMetric {
    chapterIndex: number;
    columnCount: number;
}

interface FlatPage {
    chapterIndex: number;
    columnIndex: number;
    isFirstPageOfChapter: boolean;
}

const Handbook: FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // State for pagination logic
    const [pageMetrics, setPageMetrics] = useState<PageMetric[] | null>(null);
    const [flatPages, setFlatPages] = useState<FlatPage[]>([]);
    
    // State for UI and navigation
    const [currentPage, setCurrentPage] = useState(0); // This is the index of the left page in the spread
    const [isAnimating, setIsAnimating] = useState<false | 'forward' | 'backward'>(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Effect 1: Calculate page metrics for pagination
    useEffect(() => {
        const metrics: PageMetric[] = [];
        const measureContainer = document.getElementById('handbook-measure-container');
        if (measureContainer) {
            Array.from(measureContainer.children).forEach((child, index) => {
                const pageContent = child as HTMLDivElement;
                const columnCount = Math.max(1, Math.round(pageContent.scrollWidth / pageContent.clientWidth));
                metrics.push({ chapterIndex: index, columnCount });
            });
            setPageMetrics(metrics);
        }
    }, []);

    // Effect 2: Build the flat page structure once metrics are calculated
    useEffect(() => {
        if (!pageMetrics) return;

        const newFlatPages: FlatPage[] = [];
        pageMetrics.forEach(({ chapterIndex, columnCount }) => {
            for (let i = 0; i < columnCount; i++) {
                newFlatPages.push({
                    chapterIndex,
                    columnIndex: i,
                    isFirstPageOfChapter: i === 0,
                });
            }
        });
        setFlatPages(newFlatPages);
        
        // After building pages, check hash for deep linking
        const hash = location.hash;
        if (hash && hash.startsWith('#page/')) {
            const pageNum = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < newFlatPages.length) {
                setCurrentPage(pageNum % 2 === 0 ? pageNum : pageNum - 1);
            }
        }

    }, [pageMetrics]);

    const handleNavigate = useCallback((direction: 'forward' | 'backward' | number) => {
        if (isAnimating || flatPages.length === 0) return;

        let newPage = currentPage;
        let isDirectJump = false;

        if (typeof direction === 'number') {
            const targetChapterIndex = direction;
            const firstPageIndex = flatPages.findIndex(p => p.chapterIndex === targetChapterIndex);
            if (firstPageIndex !== -1) {
                newPage = firstPageIndex % 2 === 0 ? firstPageIndex : firstPageIndex - 1;
                isDirectJump = true;
            }
        } else if (direction === 'forward') {
            newPage = Math.min(flatPages.length - 2, currentPage + 2);
        } else {
            newPage = Math.max(0, currentPage - 2);
        }

        if (newPage !== currentPage) {
            const animationDirection = isDirectJump ? false : (newPage > currentPage ? 'forward' : 'backward');
            if (animationDirection) {
                setIsAnimating(animationDirection);
            }
            
            setTimeout(() => {
                setCurrentPage(newPage);
                navigate(`#page/${newPage}`);
                if (animationDirection) {
                    setIsAnimating(false);
                }
            }, animationDirection ? 500 : 0);
        } else if (isDirectJump) {
            navigate(`#page/${newPage}`);
        }
    }, [isAnimating, currentPage, flatPages, navigate]);

     const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const selection = window.getSelection();

        // Don't navigate if user is selecting text or clicking a link
        if ((selection && selection.toString().length > 0) || target.closest('a')) {
            const href = target.closest('a')?.getAttribute('href');
            if (href && href.startsWith('#page/')) {
                e.preventDefault();
                const chapterIndex = parseInt(href.replace('#page/', ''), 10);
                if (!isNaN(chapterIndex)) {
                    handleNavigate(chapterIndex);
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
            let pageCounter = 1;

            const addPageNumber = (doc: jsPDF, pageNum: number, totalPages: number) => {
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${pageNum}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 20);
            };

            const coverElement = document.getElementById('handbook-cover-page-render-source');
            if (coverElement) {
                const canvas = await html2canvas(coverElement, { scale: 2 });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
            }
            pdf.addPage(); // Blank back of cover

            for (let i = 1; i < initialChapters.length; i++) {
                const chapter = initialChapters[i];
                const isTOC = i === 2;
                
                if (i > 1) { // Chapters start on odd pages
                    if ((pdf.internal.getNumberOfPages() + 1) % 2 !== 0) {
                        pdf.addPage();
                    }
                }
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chapter.content;
                tempDiv.className = 'prose max-w-none prose-slate bg-white p-8';
                tempDiv.style.width = `${pageWidth - 80}px`; // Match margins
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                if(isTOC) tempDiv.classList.add('handbook-toc-pdf');
                
                document.body.appendChild(tempDiv);
                
                await pdf.html(tempDiv, {
                    callback: (doc) => { document.body.removeChild(tempDiv); },
                    autoPaging: 'text',
                    margin: [40, 40, 40, 40],
                    html2canvas: { scale: 2, useCORS: true },
                    windowWidth: pageWidth - 80,
                });
            }

            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 3; i <= totalPages; i++) {
                pdf.setPage(i);
                addPageNumber(pdf, i - 2, totalPages - 2);
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
    
    const totalPageSpreads = Math.ceil(flatPages.length / 2);
    const currentPageSpread = Math.floor(currentPage / 2) + 1;
    
    const leftPageData = flatPages[currentPage];
    const rightPageData = flatPages[currentPage + 1];

    const leftChapter = leftPageData ? initialChapters[leftPageData.chapterIndex] : null;
    const rightChapter = rightPageData ? initialChapters[rightPageData.chapterIndex] : null;

    const leftPageClass = isAnimating === 'backward' ? 'animate-page-flip-backward' : '';
    const rightPageClass = isAnimating === 'forward' ? 'animate-page-flip-forward' : '';

    const Page = ({ pageData, chapterData }: { pageData?: FlatPage; chapterData?: Chapter }) => {
        const pageRef = useRef<HTMLDivElement>(null);
        const [pageWidth, setPageWidth] = useState(0);

        useEffect(() => {
            if (pageRef.current) {
                setPageWidth(pageRef.current.clientWidth);
            }
        }, [pageRef.current]);

        if (!pageData || !chapterData) {
            return <div className="p-8 sm:p-12"></div>;
        }

        const isTOC = chapterData.title === "Table of Contents";

        return (
            <div ref={pageRef} className="p-8 sm:p-12 h-full overflow-hidden prose max-w-none prose-slate">
                <div 
                    className={isTOC ? 'handbook-toc' : ''}
                    style={{
                        height: '100%',
                        columnWidth: `${pageWidth}px`,
                        columnGap: '80px', // Corresponds to margin
                        transform: `translateX(-${pageData.columnIndex * (pageWidth + 80)}px)`,
                    }}
                    dangerouslySetInnerHTML={{ __html: chapterData.content }}
                />
            </div>
        );
    };

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-2 sm:p-4 rounded-xl shadow-inner">
             {/* Hidden container for measuring chapter content columns */}
            <div id="handbook-measure-container" className="absolute -left-[9999px] top-0 pointer-events-none opacity-0" style={{ width: '500px' /* approx page width */ }}>
                {initialChapters.map((chapter, index) => (
                    <div key={index} className="prose max-w-none prose-slate p-8 sm:p-12" dangerouslySetInnerHTML={{ __html: chapter.content }} />
                ))}
            </div>
            {/* Hidden element for rendering the cover for PDF generation */}
            <div id="handbook-cover-page-render-source" className="prose max-w-none prose-slate" style={{ width: '595pt', height: '842pt', position: 'absolute', left: '-9999px', top: 0, background: 'white' }}>
                <div dangerouslySetInnerHTML={{ __html: initialChapters[0].content }} style={{ height: '100%' }} />
            </div>

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
                    <button onClick={() => handleNavigate('backward')} disabled={!!isAnimating || currentPage === 0} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-semibold text-slate-600">{currentPageSpread} / {totalPageSpreads}</span>
                    <button onClick={() => handleNavigate('forward')} disabled={!!isAnimating || currentPage >= flatPages.length - 2} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto aspect-[17/11] perspective" onClick={handlePageClick}>
                {flatPages.length > 0 ? (
                    <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                        <div className={`bg-white shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden relative ${leftPageClass} backface-hidden`}>
                            <Page pageData={leftPageData} chapterData={leftChapter} />
                        </div>
                        <div className={`bg-white shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden relative ${rightPageClass} backface-hidden`}>
                            <Page pageData={rightPageData} chapterData={rightChapter} />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
                )}
            </div>
            <style>{`
                .handbook-toc a { text-decoration: none; color: inherit; } 
                .handbook-toc a:hover { color: rgb(var(--color-primary-rgb)); text-decoration: underline; }
                .handbook-toc-pdf a { color: black; text-decoration: none; }
            `}</style>
        </div>
    );
};

export default Handbook;
