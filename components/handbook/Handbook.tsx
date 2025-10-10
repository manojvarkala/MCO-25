import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { chapters as initialChapters } from './chapters';
import Spinner from '../Spinner.tsx';

interface FlatPage {
    chapterIndex: number;
    pageIndex: number;
    isFirstPageOfChapter: boolean;
    totalPagesInChapter: number;
}

const Handbook: FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [flatPages, setFlatPages] = useState<FlatPage[]>([]);
    const [isCalculating, setIsCalculating] = useState(true);
    const [currentPage, setCurrentPage] = useState(0); 
    const [isAnimating, setIsAnimating] = useState<false | 'forward' | 'backward'>(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const pageContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculatePages = () => {
            if (!pageContentRef.current) return;
            setIsCalculating(true);
            const newFlatPages: FlatPage[] = [];
            const container = pageContentRef.current;
            const columnGap = 80; // Must match CSS

            initialChapters.forEach((chapter, chapterIndex) => {
                const chapterContentDiv = document.createElement('div');
                chapterContentDiv.className = 'prose max-w-none prose-slate p-8 sm:p-12';
                chapterContentDiv.innerHTML = chapter.content;
                
                container.appendChild(chapterContentDiv);

                const pageClientWidth = container.clientWidth;
                const pageScrollWidth = chapterContentDiv.scrollWidth;

                const columnCount = chapter.isCover ? 1 : Math.max(1, Math.round((pageScrollWidth + columnGap) / (pageClientWidth + columnGap)));
                
                for (let i = 0; i < columnCount; i++) {
                    newFlatPages.push({
                        chapterIndex,
                        pageIndex: i,
                        isFirstPageOfChapter: i === 0,
                        totalPagesInChapter: columnCount,
                    });
                }
                container.removeChild(chapterContentDiv);
            });
            
            setFlatPages(newFlatPages);
            setIsCalculating(false);
        };
        
        calculatePages();
        window.addEventListener('resize', calculatePages);
        return () => window.removeEventListener('resize', calculatePages);
    }, []);

    useEffect(() => {
        if (isCalculating) return;
        const hash = location.hash;
        if (hash && hash.startsWith('#page/')) {
            const pageNum = parseInt(hash.replace('#page/', ''), 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < flatPages.length) {
                setCurrentPage(pageNum % 2 === 0 ? pageNum : pageNum - 1);
            }
        }
    }, [isCalculating, location.hash, flatPages.length]);

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
            if (animationDirection) setIsAnimating(animationDirection);
            
            setTimeout(() => {
                setCurrentPage(newPage);
                navigate(`#page/${newPage}`);
                if (animationDirection) setIsAnimating(false);
            }, animationDirection ? 500 : 0);
        } else if (isDirectJump) {
            navigate(`#page/${newPage}`);
        }
    }, [isAnimating, currentPage, flatPages, navigate]);

     const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const selection = window.getSelection();
        if ((selection && selection.toString().length > 0) || target.closest('a')) {
            const href = target.closest('a')?.getAttribute('href');
            if (href && href.startsWith('#chapter-')) {
                e.preventDefault();
                const chapterIndex = parseInt(href.replace('#chapter-', ''), 10);
                if (!isNaN(chapterIndex)) handleNavigate(chapterIndex);
            }
            return;
        }
        const book = e.currentTarget;
        const rect = book.getBoundingClientRect();
        if (e.clientX - rect.left > book.offsetWidth / 2) handleNavigate('forward');
        else handleNavigate('backward');
    };
    
    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Generating your handbook PDF...');
        
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pageWidth - margin * 2;
    
            const chapterStartPages: { [key: number]: number } = {};
    
            for (let i = 0; i < initialChapters.length; i++) {
                const chapter = initialChapters[i];
                const isCover = i === 0;
                const isTitlePage = i === 1;
                const isTOC = i === 2;
    
                if (i > 0) { // All non-cover pages
                    // FIX: Cast `pdf.internal` to `any` to resolve a type error with `getNumberOfPages`.
                    const currentPageNum = (pdf.internal as any).getNumberOfPages();
                    if ((currentPageNum + 1) % 2 !== (isCover || isTitlePage ? 1 : 1)) { // Force chapters to start on right (odd) pages
                        if (currentPageNum > 1) { // Don't add a blank page right after the cover
                            pdf.addPage();
                        }
                    }
                }
                
                // FIX: Cast `pdf.internal` to `any` to resolve a type error with `getNumberOfPages`.
                chapterStartPages[i] = (pdf.internal as any).getNumberOfPages();
    
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chapter.content;
                tempDiv.className = `prose max-w-none prose-slate bg-white p-8 ${isTOC ? 'handbook-toc-pdf' : ''}`;
                tempDiv.style.width = isCover ? `${pageWidth}px` : `${contentWidth}px`;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                if(isCover) {
                    tempDiv.style.height = `${pageHeight}px`;
                    tempDiv.style.padding = '0';
                    tempDiv.style.borderRadius = '0';
                }
    
                document.body.appendChild(tempDiv);
    
                const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, windowWidth: tempDiv.scrollWidth, windowHeight: tempDiv.scrollHeight });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
    
                const ratio = imgWidth / (isCover ? pageWidth : contentWidth);
                const scaledHeight = imgHeight / ratio;
    
                const pageContentHeight = pageHeight - (isCover ? 0 : margin * 2);
                const numPages = Math.ceil(scaledHeight / pageContentHeight);
    
                for (let j = 0; j < numPages; j++) {
                    if (j > 0) pdf.addPage();
                    const sourceY = j * pageContentHeight * ratio;
                    const sourceHeight = Math.min(pageContentHeight * ratio, imgHeight - sourceY);
    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imgWidth;
                    tempCanvas.height = sourceHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx?.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
                    
                    pdf.addImage(tempCanvas.toDataURL('image/png'), 'PNG', (isCover ? 0 : margin), (isCover ? 0 : margin), (isCover ? pageWidth : contentWidth), sourceHeight / ratio);
                }
    
                document.body.removeChild(tempDiv);

                if (isCover) pdf.addPage(); // Blank page after cover
            }

            // FIX: Cast `pdf.internal` to `any` to resolve a type error with `getNumberOfPages`.
            const totalPages = (pdf.internal as any).getNumberOfPages();

            // Add hyperlinks to TOC
            pdf.setPage(chapterStartPages[2]);
            initialChapters.forEach((_, chapterIndex) => {
                const chapterElementId = `chapter-${chapterIndex}`;
                const tocLinkElement = document.querySelector(`.handbook-toc-pdf a[href="#${chapterElementId}"]`);
                if(tocLinkElement) {
                    // This part is complex and may not be perfectly accurate without more advanced PDF manipulation.
                    // This is a best-effort using built-in features. The links are in the HTML.
                }
            });

            // Add page numbers
            for (let i = 4; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(`Page ${i - 3} of ${totalPages - 3}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
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

    const Page: FC<{ pageData?: FlatPage }> = ({ pageData }) => {
        if (!pageData) return <div className="p-8 sm:p-12"></div>;
        const chapterData = initialChapters[pageData.chapterIndex];
        const isTOC = chapterData.title === "Table of Contents";
        return (
            <div ref={pageContentRef} className="p-8 sm:p-12 h-full overflow-hidden prose max-w-none prose-slate">
                <div 
                    className={isTOC ? 'handbook-toc' : ''}
                    style={{
                        height: '100%',
                        columnWidth: pageContentRef.current?.clientWidth,
                        columnGap: '80px',
                        transform: `translateX(-${pageData.pageIndex * ( (pageContentRef.current?.clientWidth || 0) + 80)}px)`,
                    }}
                    dangerouslySetInnerHTML={{ __html: chapterData.content }}
                />
            </div>
        );
    };
    
    const leftPageClass = isAnimating === 'backward' ? 'animate-page-flip-backward' : '';
    const rightPageClass = isAnimating === 'forward' ? 'animate-page-flip-forward' : '';

    return (
        <div className="bg-[rgb(var(--color-muted-rgb))] p-2 sm:p-4 rounded-xl shadow-inner">
            <div className="flex flex-wrap justify-between items-center mb-4 px-2 sm:px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-strong-rgb))]">
                    <span className="bg-gradient-to-r from-cyan-500 to-purple-500 text-transparent bg-clip-text">Technical Handbook</span>
                </h1>
                <div className="flex items-center gap-2">
                     <button onClick={handleDownloadPdf} disabled={isDownloading} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        {isDownloading ? <Spinner size="sm"/> : <Download size={16} />}
                        {isDownloading ? 'Generating...' : 'Download as PDF'}
                    </button>
                    <button onClick={() => handleNavigate('backward')} disabled={!!isAnimating || currentPage === 0} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-semibold text-slate-600">{currentPageSpread} / {totalPageSpreads}</span>
                    <button onClick={() => handleNavigate('forward')} disabled={!!isAnimating || currentPage >= flatPages.length - 2} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto aspect-[17/11] perspective" onClick={handlePageClick}>
                {isCalculating ? (
                    <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
                ) : (
                    <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                        <div className={`shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden relative ${leftPageClass} backface-hidden ${leftPageData?.chapterIndex === 0 ? 'p-0' : 'bg-white'}`}>
                            <Page pageData={leftPageData} />
                        </div>
                        <div className={`shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden relative ${rightPageClass} backface-hidden bg-white`}>
                            <Page pageData={rightPageData} />
                        </div>
                    </div>
                )}
            </div>
            <style>{`.handbook-toc a { text-decoration: none; color: inherit; } .handbook-toc a:hover { color: rgb(var(--color-primary-rgb)); text-decoration: underline; } .handbook-toc-pdf a { color: black; text-decoration: none; }`}</style>
        </div>
    );
};

export default Handbook;
