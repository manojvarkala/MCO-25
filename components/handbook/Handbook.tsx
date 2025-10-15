import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import { chapters } from './chapters.ts';

// --- MAIN COMPONENT ---

const Handbook: FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [pageInfo, setPageInfo] = useState({ currentPage: 1, totalPages: 1 });

    const calculatePages = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            // A page spread is the visible width of the container
            const pageSpreadWidth = container.clientWidth;
            // The total width includes all the columns
            const totalWidth = container.scrollWidth;
            if (pageSpreadWidth > 0) {
                const totalPageSpreads = Math.ceil(totalWidth / pageSpreadWidth);
                const currentPageSpread = Math.round(container.scrollLeft / pageSpreadWidth) + 1;
                setPageInfo({ currentPage: currentPageSpread, totalPages: totalPageSpreads });
            }
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(calculatePages, 150); // Give a bit more time for rendering
        const resizeObserver = new ResizeObserver(calculatePages);
        if (scrollContainerRef.current) {
            resizeObserver.observe(scrollContainerRef.current);
        }
        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
        };
    }, [calculatePages]);

    const handleNavigate = (direction: 'forward' | 'backward') => {
        const container = scrollContainerRef.current;
        if (container) {
            const pageSpreadWidth = container.clientWidth;
            const newScrollLeft = direction === 'forward'
                ? container.scrollLeft + pageSpreadWidth
                : container.scrollLeft - pageSpreadWidth;
            container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }
    };
    
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        let scrollTimeout: number;
        const handleScroll = () => {
           window.clearTimeout(scrollTimeout);
           scrollTimeout = window.setTimeout(() => {
                calculatePages();
           }, 100);
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [calculatePages]);
    
    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Generating professional handbook PDF...', { duration: Infinity });

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const A4_WIDTH = 595.28;
            const A4_HEIGHT = 841.89;
            const MARGIN = 40;
            const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
            const CONTENT_HEIGHT = A4_HEIGHT - MARGIN * 2 - 30; // 30 for header/footer

            const addHeaderAndFooter = (pageNumber: number, totalPages: number) => {
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text('Annapoorna Examination Engine Handbook', MARGIN, MARGIN / 2);
                pdf.text(`Page ${pageNumber} of ${totalPages}`, A4_WIDTH - MARGIN - 50, A4_HEIGHT - MARGIN / 2);
            };

            const renderContainer = document.createElement('div');
            renderContainer.style.position = 'absolute';
            renderContainer.style.left = '-9999px';
            renderContainer.style.width = `${CONTENT_WIDTH}px`;
            renderContainer.style.fontFamily = 'sans-serif';
            renderContainer.style.color = '#334155';
            document.body.appendChild(renderContainer);

            // 1. Render Cover
            const coverElement = document.createElement('div');
            coverElement.style.width = `${A4_WIDTH}px`;
            coverElement.style.height = `${A4_HEIGHT}px`;
            coverElement.innerHTML = chapters[0].content;
            document.body.appendChild(coverElement);
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH, A4_HEIGHT);
            document.body.removeChild(coverElement);
            
            let pdfPageCount = 1;

            // 2. Render all other chapters
            for (let i = 1; i < chapters.length; i++) {
                toast.loading(`Processing Chapter ${i} of ${chapters.length - 1}...`, { id: toastId });
                pdf.addPage();
                pdfPageCount++;

                const chapterDiv = document.createElement('div');
                chapterDiv.className = 'prose max-w-none prose-slate';
                chapterDiv.innerHTML = chapters[i].content;
                renderContainer.appendChild(chapterDiv);

                const canvas = await html2canvas(chapterDiv, {
                    scale: 2,
                    useCORS: true,
                    windowWidth: chapterDiv.scrollWidth,
                    windowHeight: chapterDiv.scrollHeight
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * CONTENT_WIDTH) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                // First page of the chapter
                pdf.addImage(imgData, 'PNG', MARGIN, MARGIN, CONTENT_WIDTH, imgHeight);
                heightLeft -= CONTENT_HEIGHT;
                
                // Add new pages if content overflows
                while (heightLeft > 0) {
                    position += CONTENT_HEIGHT;
                    pdf.addPage();
                    pdfPageCount++;
                    pdf.addImage(imgData, 'PNG', MARGIN, MARGIN - position, CONTENT_WIDTH, imgHeight);
                    heightLeft -= CONTENT_HEIGHT;
                }
                renderContainer.removeChild(chapterDiv);
            }
            
            // 3. Add Headers and Footers to all but the cover page
            for(let i = 2; i <= pdfPageCount; i++) {
                pdf.setPage(i);
                addHeaderAndFooter(i-1, pdfPageCount - 1);
            }

            document.body.removeChild(renderContainer);

            pdf.save('Annapoorna-Examination-Engine-Handbook.pdf');
            toast.success('Handbook downloaded!', { id: toastId, duration: 4000 });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId, duration: 4000 });
        } finally {
            setIsDownloading(false);
        }
    };


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
                    <button onClick={() => handleNavigate('backward')} disabled={pageInfo.currentPage <= 1} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-semibold text-slate-600 w-16 text-center">{pageInfo.currentPage} / {pageInfo.totalPages}</span>
                    <button onClick={() => handleNavigate('forward')} disabled={pageInfo.currentPage >= pageInfo.totalPages} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div 
                ref={scrollContainerRef}
                className="w-full max-w-7xl mx-auto aspect-[4/3] overflow-x-scroll overflow-y-hidden scroll-smooth snap-x snap-mandatory shadow-2xl bg-slate-400"
                style={{ scrollbarWidth: 'thin' }}
            >
                <div className="h-full prose max-w-none prose-slate" style={{ columnWidth: 'calc(50% - 3rem)', columnGap: '6rem', columnFill: 'auto', padding: '0 3rem' }}>
                    {chapters.map((chapter, index) => (
                        <div
                            key={index}
                            className={`py-8 bg-white break-inside-avoid-column ${chapter.isCover ? 'h-full !p-0' : ''}`}
                            dangerouslySetInnerHTML={{ __html: chapter.content }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Handbook;