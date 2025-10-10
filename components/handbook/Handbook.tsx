import React, { FC, useState, useCallback } from 'react';
import { BookOpen, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { chapters as chapterData } from './chapters.ts';
import Spinner from '../Spinner.tsx';

const Handbook: FC = () => {
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const chapters = chapterData; // Use imported data

    const handleDownload = useCallback(async () => {
        setIsGeneratingPdf(true);
        const toastId = toast.loading('Generating PDF... Step 1 of ' + chapters.length);
        
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - margin * 2;

            for (let i = 0; i < chapters.length; i++) {
                toast.loading(`Generating PDF... Step ${i + 1} of ${chapters.length}`, { id: toastId });
                
                if (i > 0) {
                    doc.addPage();
                }

                const chapter = chapters[i];
                const isCover = chapter.id === 'cover';

                const renderContainer = document.createElement('div');
                renderContainer.style.position = 'absolute';
                renderContainer.style.left = '-9999px';
                renderContainer.style.width = isCover ? `${pageWidth}mm` : `${contentWidth}mm`;
                if (isCover) renderContainer.style.height = `${pageHeight}mm`;

                const chapterHtml = chapter.content;
                renderContainer.innerHTML = chapterHtml;
                document.body.appendChild(renderContainer);

                const elementToRender = isCover ? (renderContainer.querySelector('div') || renderContainer) : renderContainer;
                
                const canvas = await html2canvas(elementToRender, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: isCover ? null : '#ffffff',
                });
                
                document.body.removeChild(renderContainer);

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (isCover) {
                    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
                } else {
                    let position = 0;
                    let pageAdded = false;
                    while (position < imgHeight) {
                        if (pageAdded) {
                            doc.addPage();
                        }
                        doc.addImage(imgData, 'PNG', margin, margin - position, imgWidth, imgHeight);
                        position += contentHeight;
                        pageAdded = true;
                    }
                }
            }

            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor('#9ca3af');
                const text = `Page ${i} of ${totalPages}`;
                const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(text, (pageWidth - textWidth) / 2, pageHeight - 10);
            }

            doc.save('Annapoorna_Exam_Engine_Handbook.pdf');
            toast.success('Handbook downloaded successfully!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to download PDF.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
        }
    }, [chapters]);

    const handleTocClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const chapterId = target.getAttribute('data-chapter-id');
        if (chapterId) {
            e.preventDefault();
            const index = chapters.findIndex(c => c.id === chapterId);
            if (index !== -1) {
                setActiveChapterIndex(index);
            }
        }
    };

    const activeChapter = chapters[activeChapterIndex];

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-500 to-purple-600 text-transparent bg-clip-text font-display flex items-center gap-3">
                <BookOpen />
                Annapoorna Exam Engine Handbook
            </h1>

            <div className="bg-[rgb(var(--color-card-rgb))] rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))] flex flex-col md:flex-row min-h-[70vh]">
                <aside className="w-full md:w-1/3 lg:w-1/4 p-6 border-b md:border-b-0 md:border-r border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-lg font-bold mb-4">Contents</h2>
                    <nav className="space-y-2">
                        {chapters.map((chapter, index) => (
                            <button
                                key={chapter.id}
                                onClick={() => setActiveChapterIndex(index)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    activeChapterIndex === index
                                        ? 'bg-[rgba(var(--color-primary-rgb),0.1)] text-[rgb(var(--color-primary-rgb))]'
                                        : 'text-[rgb(var(--color-text-muted-rgb))] hover:bg-[rgb(var(--color-muted-rgb))] hover:text-[rgb(var(--color-text-strong-rgb))]'
                                }`}
                            >
                                {chapter.title}
                            </button>
                        ))}
                    </nav>
                     <div className="mt-6 pt-6 border-t border-[rgb(var(--color-border-rgb))]">
                        <button 
                            onClick={handleDownload}
                            disabled={isGeneratingPdf}
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-400"
                        >
                            {isGeneratingPdf ? <Spinner size="sm"/> : <Download size={16}/>}
                            {isGeneratingPdf ? 'Generating...' : 'Download as PDF'}
                        </button>
                    </div>
                </aside>

                <main className="w-full md:w-2/3 lg:w-3/4 p-2 md:p-8 flex flex-col">
                    <div className="flex-grow">
                        {activeChapter.isCover ? (
                            <div className="h-full" dangerouslySetInnerHTML={{ __html: activeChapter.content }} />
                        ) : (
                            <div>
                                <h2 className="text-3xl font-bold text-[rgb(var(--color-primary-rgb))] mb-6 pb-4 border-b border-[rgb(var(--color-border-rgb))]">
                                    {activeChapter.title}
                                </h2>
                                <div
                                    className="prose prose-slate max-w-none"
                                    onClick={handleTocClick}
                                    dangerouslySetInnerHTML={{ __html: activeChapter.content }}
                                />
                            </div>
                        )}
                    </div>
                    
                    
                    <div className="mt-8 pt-6 border-t border-[rgb(var(--color-border-rgb))] flex justify-between">
                        <button
                            onClick={() => setActiveChapterIndex(prev => Math.max(0, prev - 1))}
                            disabled={activeChapterIndex === 0}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1))}
                            disabled={activeChapterIndex === chapters.length - 1}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Handbook;