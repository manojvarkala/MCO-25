import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import { chapters } from './chapters.ts';

// --- MAIN COMPONENT ---

const Handbook: FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [isAnimating, setIsAnimating] = useState<false | 'forward' | 'backward'>(false);
    
    const handleNavigate = useCallback((direction: 'forward' | 'backward') => {
        if (isAnimating) return;

        let newPage = currentPage;
        if (direction === 'forward') {
            newPage = Math.min(chapters.length - 2, currentPage + 2);
        } else {
            newPage = Math.max(0, currentPage - 2);
        }

        if (newPage !== currentPage) {
            setIsAnimating(direction);
            setTimeout(() => {
                setCurrentPage(newPage);
                setIsAnimating(false);
            }, 500);
        }
    }, [isAnimating, currentPage]);

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Generating professional handbook PDF...', { duration: Infinity });
    
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pageWidth - margin * 2;
    
            // Function to add header and footer
            const addHeaderFooter = (pdfInstance: jsPDF, pageNum: number, totalPages: number) => {
                pdfInstance.setFontSize(8);
                pdfInstance.setTextColor(150);
                pdfInstance.text('Annapoorna Examination Engine Handbook', margin, margin / 2);
                pdfInstance.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - margin / 2, { align: 'right' });
            };

            // 1. Render all content into one super-long container (without padding)
            const contentContainer = document.createElement('div');
            contentContainer.style.width = `${contentWidth}px`;
            contentContainer.style.position = 'absolute';
            contentContainer.style.left = '-9999px';
            contentContainer.style.backgroundColor = 'white';

            let allContentHtml = '';
            for (let i = 1; i < chapters.length; i++) {
                // Wrap each chapter in a padded div for html2canvas to render spacing
                allContentHtml += `<div class="prose max-w-none prose-slate" style="padding: ${margin}px; page-break-inside: avoid;">${chapters[i].content}</div><div style="height: 1px;"></div>`;
            }
            contentContainer.innerHTML = allContentHtml;
            document.body.appendChild(contentContainer);

            const contentCanvas = await html2canvas(contentContainer, {
                scale: 2,
                useCORS: true,
                windowWidth: contentContainer.scrollWidth,
                windowHeight: contentContainer.scrollHeight,
            });
            document.body.removeChild(contentContainer);

            // 2. Add Cover Page separately
            const coverElement = document.createElement('div');
            coverElement.innerHTML = chapters[0].content;
            coverElement.style.width = `${pageWidth}px`;
            coverElement.style.height = `${pageHeight}px`;
            coverElement.style.position = 'absolute';
            coverElement.style.left = '-9999px';
            document.body.appendChild(coverElement);
            const coverCanvas = await html2canvas(coverElement, { scale: 2, useCORS: true });
            document.body.removeChild(coverElement);
            const coverImgData = coverCanvas.toDataURL('image/png');
            pdf.addImage(coverImgData, 'PNG', 0, 0, pageWidth, pageHeight);

            // 3. Paginate the main content canvas
            const imgData = contentCanvas.toDataURL('image/png');
            const contentImgHeight = contentCanvas.height * (pageWidth / contentCanvas.width);
            const pageContentHeight = pageHeight;
            let heightLeft = contentImgHeight;
            let position = 0;
            let pageCount = 1;

            while (heightLeft > 0) {
                pdf.addPage();
                pageCount++;
                pdf.addImage(imgData, 'PNG', 0, -position, pageWidth, contentImgHeight);
                heightLeft -= pageContentHeight;
                position += pageContentHeight;
            }

            // 4. Add headers and footers to all pages except the cover
            const totalPages = pdf.internal.pages.length - 1;
            for (let i = 2; i <= totalPages + 1; i++) {
                pdf.setPage(i);
                addHeaderFooter(pdf, i - 1, totalPages);
            }
    
            pdf.save('Annapoorna-Examination-Engine-Handbook.pdf');
            toast.success('Handbook downloaded!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsDownloading(false);
        }
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
                    <span className="text-sm font-semibold text-slate-600">{Math.floor(currentPage / 2) + 1} / {Math.ceil(chapters.length / 2)}</span>
                    <button onClick={() => handleNavigate('forward')} disabled={!!isAnimating || currentPage >= chapters.length - 2} className="p-2 rounded-md bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div className="w-full max-w-7xl mx-auto aspect-[4/3] perspective">
                <div className="w-full h-full grid grid-cols-2 gap-4 transform-style-3d">
                    <div className={`shadow-lg rounded-l-lg border-r border-slate-200 overflow-hidden relative ${leftPageClass} backface-hidden ${chapters[currentPage]?.isCover ? 'p-0' : 'bg-white'}`}>
                        <div className="p-4 sm:p-8 h-full overflow-y-auto prose max-w-none prose-slate prose-pre:whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: chapters[currentPage]?.content || '' }} />
                    </div>
                    <div className={`shadow-lg rounded-r-lg border-l border-slate-200 overflow-hidden relative ${rightPageClass} backface-hidden bg-white`}>
                        <div className="p-4 sm:p-8 h-full overflow-y-auto prose max-w-none prose-slate prose-pre:whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: chapters[currentPage + 1]?.content || '' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Handbook;
