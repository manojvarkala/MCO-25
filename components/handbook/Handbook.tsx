import React, { FC, useState, useRef, useEffect } from 'react';
import { BookOpen, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { chapters as allChaptersData } from './chapters.ts';

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfPrintRef = useRef<HTMLDivElement>(null);

    // --- Flipbook State ---
    const [currentPage, setCurrentPage] = useState(0);
    const [pageJumpMap, setPageJumpMap] = useState<Map<string, number>>(new Map());

    const displayPages = allChaptersData.filter(c => !c.isCover);
    const tocPageIndex = displayPages.findIndex(p => p.isToc);

    // Create a map for TOC jumps on mount
    useEffect(() => {
        const map = new Map<string, number>();
        displayPages.forEach((page, index) => {
            const match = page.content.match(/id="([^"]+)"/);
            if (match) {
                map.set(match[1], index);
            }
        });
        setPageJumpMap(map);
    }, [displayPages]);

    const handleTocClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.hash) {
            e.preventDefault();
            const targetId = link.hash.substring(1);
            if (pageJumpMap.has(targetId)) {
                let pageIndex = pageJumpMap.get(targetId)!;
                // If the target page is on the right side of a spread, show the left page.
                if (pageIndex > 0 && pageIndex % 2 !== 0) {
                    pageIndex -= 1;
                }
                setCurrentPage(pageIndex);
            }
        }
    };
    
    const handleNextPage = () => {
        const nextPageIndex = currentPage === 0 ? 1 : currentPage + 2;
        if (nextPageIndex < displayPages.length) {
            setCurrentPage(nextPageIndex);
        }
    };

    const handlePrevPage = () => {
        const prevPageIndex = currentPage === 1 ? 0 : currentPage - 2;
        if (prevPageIndex >= 0) {
            setCurrentPage(prevPageIndex);
        }
    };

    const generatePdf = async () => {
        if (!pdfPrintRef.current) return;
        setIsGeneratingPdf(true);
        const toastId = toast.loading('Step 1/4: Initializing PDF generator...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;

            // --- 1. Cover Page ---
            const coverContent = allChaptersData.find(c => c.isCover)?.content;
            if (coverContent) {
                const coverContainer = document.createElement('div');
                coverContainer.className = 'handbook-pdf-cover-container';
                coverContainer.innerHTML = coverContent;
                pdfPrintRef.current.appendChild(coverContainer);
                const coverCanvas = await html2canvas(coverContainer, { scale: 2, useCORS: true });
                pdf.addImage(coverCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageWidth, pageHeight);
                pdfPrintRef.current.innerHTML = ''; // Clean up
            }

            // --- 2. Table of Contents ---
            toast.loading('Step 2/4: Generating table of contents...', { id: toastId });
            const tocContentHtml = allChaptersData.find(c => c.isToc)?.content;
            if (tocContentHtml) {
                pdf.addPage();
                const tocContainer = document.createElement('div');
                tocContainer.className = 'handbook-pdf-content';
                tocContainer.innerHTML = tocContentHtml;
                pdfPrintRef.current.appendChild(tocContainer);
                await pdf.html(tocContainer, {
                    callback: (doc) => { if (pdfPrintRef.current) pdfPrintRef.current.innerHTML = ''; return doc; },
                    margin: [margin, margin, margin, margin],
                    autoPaging: 'text',
                });
            }
            
            // --- 3. Content Chapters ---
            const contentChapters = allChaptersData.filter(c => !c.isCover && !c.isToc && !c.isTitlePage);
            for (let i = 0; i < contentChapters.length; i++) {
                toast.loading(`Step 3/4: Processing Chapter ${i + 1} of ${contentChapters.length}...`, { id: toastId });
                pdf.addPage();
                const chapterContainer = document.createElement('div');
                chapterContainer.className = 'handbook-pdf-content';
                chapterContainer.innerHTML = contentChapters[i].content;
                pdfPrintRef.current.appendChild(chapterContainer);

                await pdf.html(chapterContainer, {
                    callback: (doc) => { if (pdfPrintRef.current) pdfPrintRef.current.innerHTML = ''; return doc; },
                    margin: [margin, margin, margin, margin],
                    autoPaging: 'text',
                });
            }
            
            // --- 4. Add Headers and Footers ---
            toast.loading('Step 4/4: Adding pagination...', { id: toastId });
            const pageCount = pdf.getNumberOfPages();
            for (let i = 2; i <= pageCount; i++) { 
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor('#64748b');
                pdf.text("Annapoorna Infotech Handbook", margin, margin / 2);
                pdf.text(`Page ${i - 1}`, pageWidth - margin, pageHeight - margin / 2, { align: 'right' });
            }

            pdf.save('Annapoorna_Infotech_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (pdfPrintRef.current) pdfPrintRef.current.innerHTML = '';
        }
    };
    
    const LeftPageComponent = displayPages[currentPage];
    const RightPageComponent = (currentPage > 0 && currentPage + 1 < displayPages.length) ? displayPages[currentPage + 1] : null;

    return (
        <div className="space-y-4">
            <div ref={pdfPrintRef} className="fixed -left-[9999px] top-0" aria-hidden="true"></div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                        <BookOpen /> Administrator Handbook
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted-rgb))] mt-2">A comprehensive guide to the Examination Engine.</p>
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

            <div className="flipbook-container">
                <div className="flipbook-page-container">
                    {/* Left Page */}
                    <div className="flipbook-page left" onClick={tocPageIndex === currentPage ? handleTocClick : undefined}>
                        <div className="handbook-page-content">
                            {LeftPageComponent && <div className="handbook-content" dangerouslySetInnerHTML={{ __html: LeftPageComponent.content }} />}
                        </div>
                    </div>
                    {/* Right Page */}
                    <div className="flipbook-page right" onClick={tocPageIndex === currentPage + 1 ? handleTocClick : undefined}>
                        <div className="handbook-page-content">
                            {RightPageComponent ? (
                                <div className="handbook-content" dangerouslySetInnerHTML={{ __html: RightPageComponent.content }} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">End of Book</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flipbook-nav">
                    <button onClick={handlePrevPage} disabled={currentPage === 0}>
                        <ChevronLeft /> Previous
                    </button>
                    <span>Page {currentPage + 1} / {displayPages.length}</span>
                    <button onClick={handleNextPage} disabled={currentPage + 2 >= displayPages.length}>
                        Next <ChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Handbook;