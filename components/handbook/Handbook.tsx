import React, { FC, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chapters } from './chapters.ts';
import { Book, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import Spinner from '../Spinner.tsx';

const Handbook: FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Sync state from URL hash
    useEffect(() => {
        const hash = location.hash;
        if (hash.startsWith('#page/')) {
            const pageNum = parseInt(hash.substring('#page/'.length), 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < chapters.length) {
                // Ensure page number is always even for the start of a spread
                setCurrentPage(pageNum % 2 === 0 ? pageNum : pageNum - 1);
            }
        }
    }, [location.hash]);

    const goToPage = useCallback((pageIndex: number) => {
        const newPage = Math.max(0, Math.min(chapters.length - 1, pageIndex));
        // Ensure we always land on a left page (even index)
        const startOfSpread = newPage % 2 === 0 ? newPage : newPage - 1;
        if (currentPage !== startOfSpread) {
            setCurrentPage(startOfSpread);
            navigate(`#page/${startOfSpread}`);
        }
    }, [currentPage, navigate]);

    // Handle clicks inside content, e.g., for Table of Contents
    const handleNavigationClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor && anchor.hash.startsWith('#page/')) {
            e.preventDefault();
            const pageNum = parseInt(anchor.hash.substring('#page/'.length), 10);
            if (!isNaN(pageNum)) {
                goToPage(pageNum);
            }
        }
    };
    
    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        const toastId = toast.loading('Initializing PDF generation...');

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [600, 848] // Approximate A4 ratio
            });

            // Create a temporary container for rendering pages off-screen
            const renderContainer = document.createElement('div');
            renderContainer.style.width = '600px';
            renderContainer.style.position = 'absolute';
            renderContainer.style.left = '-9999px';
            document.body.appendChild(renderContainer);

            for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                toast.loading(`Processing page ${i + 1} of ${chapters.length}...`, { id: toastId });

                // Create a page element, apply styles, and set its content
                const pageWrapper = document.createElement('div');
                pageWrapper.style.width = '600px';
                pageWrapper.style.height = '848px';
                pageWrapper.style.padding = chapter.isCover ? '0' : '32px';
                pageWrapper.style.backgroundColor = 'white';
                pageWrapper.style.display = 'flex';
                pageWrapper.style.flexDirection = 'column';
                pageWrapper.style.boxSizing = 'border-box';
                
                const contentWrapper = document.createElement('div');
                contentWrapper.className = `prose`; // Use prose for consistent styling
                contentWrapper.innerHTML = chapter.content;
                pageWrapper.appendChild(contentWrapper);

                renderContainer.innerHTML = '';
                renderContainer.appendChild(pageWrapper);
                
                // Allow a brief moment for rendering, especially for complex content
                await new Promise(resolve => setTimeout(resolve, 50));

                const canvas = await html2canvas(pageWrapper, {
                    scale: 2,
                    useCORS: true,
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }
            
            document.body.removeChild(renderContainer);
            pdf.save('Annapoorna_Exam_Engine_Handbook.pdf');
            toast.success('Handbook PDF generated successfully!', { id: toastId });
        } catch (error: any) {
            console.error("PDF generation failed:", error);
            toast.error(error.message || 'Could not generate PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    const leftPage = chapters[currentPage];
    const rightPage = currentPage + 1 < chapters.length ? chapters[currentPage + 1] : null;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                    <Book /> Developer & Admin Handbook
                </h1>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:bg-slate-400"
                >
                    {isGeneratingPdf ? <Spinner /> : <Download size={18}/>}
                    {isGeneratingPdf ? 'Generating PDF...' : 'Download as PDF'}
                </button>
            </div>
            
            <div className="bg-[rgb(var(--color-card-rgb))] p-4 sm:p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                {/* Book View */}
                <div className="flex justify-center items-center">
                    <div className="w-full max-w-6xl shadow-2xl bg-white grid grid-cols-1 md:grid-cols-2">
                        {/* Left Page */}
                        <div 
                            onClick={handleNavigationClick}
                            className={`p-8 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto relative handbook-page ${leftPage.isCover ? 'cover' : ''}`}
                        >
                            <div className="handbook-content prose prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: leftPage.content }}></div>
                            <span className="absolute bottom-4 left-4 text-sm text-slate-400">{currentPage + 1}</span>
                        </div>

                        {/* Right Page */}
                        <div 
                            onClick={handleNavigationClick}
                            className={`p-8 overflow-y-auto relative handbook-page ${rightPage?.isCover ? 'cover' : ''} ${!rightPage ? 'bg-slate-50' : ''}`}
                        >
                            {rightPage ? (
                                <>
                                    <div className="handbook-content prose prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: rightPage.content }}></div>
                                    <span className="absolute bottom-4 right-4 text-sm text-slate-400">{currentPage + 2}</span>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">End of Book</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-6">
                    <button 
                        onClick={() => goToPage(currentPage - 2)}
                        disabled={currentPage === 0 || isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-muted-rgb))] rounded-lg font-semibold text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-border-rgb))] disabled:opacity-50"
                    >
                        <ChevronLeft /> Previous
                    </button>
                    <span className="text-sm text-slate-500 text-center">
                        Pages {currentPage + 1}{rightPage ? ` - ${currentPage + 2}` : ''} of {chapters.length}
                    </span>
                    <button 
                        onClick={() => goToPage(currentPage + 2)}
                        disabled={!rightPage || currentPage + 2 >= chapters.length || isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-muted-rgb))] rounded-lg font-semibold text-[rgb(var(--color-text-default-rgb))] hover:bg-[rgb(var(--color-border-rgb))] disabled:opacity-50"
                    >
                        Next <ChevronRight />
                    </button>
                </div>
            </div>
            <style>
                {`
                .handbook-page {
                    aspect-ratio: 1 / 1.414; /* A4 paper ratio */
                }
                .handbook-page.cover {
                    padding: 0 !important;
                }
                .handbook-page.cover .prose {
                    max-width: 100%;
                    height: 100%;
                }
                .handbook-toc a {
                    color: rgb(var(--color-primary-rgb));
                    text-decoration: none;
                }
                .handbook-toc a:hover {
                    text-decoration: underline;
                }
                /* Ensure nested lists in prose have correct styling */
                .handbook-content ol, .handbook-content ul {
                    margin-left: 1.25rem;
                }
                .handbook-content .prose {
                    font-size: 1rem;
                }
                `}
            </style>
        </div>
    );
};

export default Handbook;
