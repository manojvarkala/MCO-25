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
    const [currentPageIndex, setCurrentPageIndex] = useState(0); // Index for the left page of the spread
    const pageJumpMap = useRef<Map<string, number>>(new Map());

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
        pageJumpMap.current = map;
    }, [displayPages]);

    const handleTocClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.hash) {
            e.preventDefault();
            const targetId = link.hash.substring(1);
            if (pageJumpMap.current.has(targetId)) {
                let pageIndex = pageJumpMap.current.get(targetId)!;
                // If the target page is on the right side of a spread, show the left page.
                if (pageIndex > 0 && pageIndex % 2 !== 0) {
                    pageIndex -= 1;
                }
                setCurrentPageIndex(pageIndex);
            }
        }
    };

    const handleNextPage = () => {
        // Special case for cover page to TOC
        if (currentPageIndex === 0 && tocPageIndex === 1) {
            setCurrentPageIndex(1);
            return;
        }
        const nextPageIndex = currentPageIndex + 2;
        if (nextPageIndex < displayPages.length) {
            setCurrentPageIndex(nextPageIndex);
        }
    };

    const handlePrevPage = () => {
        // Special case for TOC back to title page
        if (currentPageIndex === 1) {
            setCurrentPageIndex(0);
            return;
        }
        const prevPageIndex = currentPageIndex - 2;
        if (prevPageIndex >= 0) {
            setCurrentPageIndex(prevPageIndex);
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
            const contentWidth = pageWidth - margin * 2;
            
            const renderAndAddPage = async (content: string, containerClass: string) => {
                const container = document.createElement('div');
                container.className = containerClass;
                container.innerHTML = content;
                if (pdfPrintRef.current) {
                    pdfPrintRef.current.appendChild(container);
                    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, pageHeight);
                    pdfPrintRef.current.innerHTML = ''; // Clean up
                }
            };
            
            // --- 1. Cover Page ---
            const coverContent = allChaptersData.find(c => c.isCover)?.content;
            if (coverContent) {
                await renderAndAddPage(coverContent, 'handbook-pdf-cover-container');
            }
            
            const contentChaptersForPdf = allChaptersData.filter(c => !c.isCover);

            // --- 2 & 3. TOC and Content Chapters ---
            for (let i = 0; i < contentChaptersForPdf.length; i++) {
                toast.loading(`Step ${i < tocPageIndex ? 2 : 3}/${contentChaptersForPdf.length + 1}: Processing "${contentChaptersForPdf[i].title}"...`, { id: toastId });
                pdf.addPage();
                const chapterContainer = document.createElement('div');
                chapterContainer.className = 'handbook-pdf-content';
                chapterContainer.style.width = `${contentWidth}pt`;
                chapterContainer.innerHTML = contentChaptersForPdf[i].content;
                pdfPrintRef.current.appendChild(chapterContainer);
                
                await pdf.html(chapterContainer, {
                    callback: (doc) => {
                        if (pdfPrintRef.current) pdfPrintRef.current.innerHTML = '';
                        return doc;
                    },
                    margin: [margin, margin, margin, margin],
                    autoPaging: 'text',
                    width: contentWidth,
                    windowWidth: contentWidth,
                });
            }

            // --- 4. Add Headers and Footers ---
            toast.loading('Step 4/4: Finalizing with pagination...', { id: toastId });
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
    
    // Determine which pages to show on the left and right of the spread
    let LeftPageComponent: typeof displayPages[0] | null = null;
    let RightPageComponent: typeof displayPages[0] | null = null;
    
    if (currentPageIndex === 0) { // Title page is a single page view
        LeftPageComponent = displayPages[0];
        RightPageComponent = null;
    } else if (currentPageIndex === 1 && tocPageIndex === 1) { // TOC is on the left
        LeftPageComponent = displayPages[1];
        RightPageComponent = displayPages[2] || null;
    }
    else {
        LeftPageComponent = displayPages[currentPageIndex] || null;
        RightPageComponent = displayPages[currentPageIndex + 1] || null;
    }


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
                <div className={`flipbook-page-container ${!RightPageComponent ? 'single-page-view' : ''}`}>
                    {/* Left Page */}
                    {LeftPageComponent && (
                         <div className="flipbook-page left" onClick={tocPageIndex === currentPageIndex ? handleTocClick : undefined}>
                            <div className="handbook-page-content">
                                <div className="handbook-content" dangerouslySetInnerHTML={{ __html: LeftPageComponent.content }} />
                            </div>
                        </div>
                    )}
                   
                    {/* Right Page */}
                     {RightPageComponent && (
                        <div className="flipbook-page right" onClick={tocPageIndex === currentPageIndex + 1 ? handleTocClick : undefined}>
                            <div className="handbook-page-content">
                                <div className="handbook-content" dangerouslySetInnerHTML={{ __html: RightPageComponent.content }} />
                            </div>
                        </div>
                     )}
                </div>

                <div className="flipbook-nav">
                    <button onClick={handlePrevPage} disabled={currentPageIndex === 0}>
                        <ChevronLeft /> Previous
                    </button>
                    <span>Page {currentPageIndex + 1} / {displayPages.length}</span>
                    <button onClick={handleNextPage} disabled={currentPageIndex + 2 >= displayPages.length}>
                        Next <ChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Handbook;
