
import React, { FC, useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { chapters } from './chapters.ts';
import { Download, BookOpen } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import { useAppContext } from '../../context/AppContext.tsx';

const Handbook: FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const { activeOrg } = useAppContext();

    const processedChapters = useMemo(() => {
        if (!activeOrg) return chapters;
        return chapters.map(chapter => ({
            ...chapter,
            content: chapter.content
                .replace(/Annapoorna Infotech/g, activeOrg.name)
                .replace(/annapoornainfo.com/g, activeOrg.website)
        }));
    }, [activeOrg]);

    const generatePdf = async () => {
        if (!contentRef.current) {
            toast.error("Content container not found.");
            return;
        }

        setIsGenerating(true);
        const toastId = toast.loading('Generating Handbook PDF, please wait...', { duration: Infinity });

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });
            
            // The html method from jsPDF handles pagination from an HTML element.
            await pdf.html(contentRef.current, {
                callback: function (doc) {
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        // Add page numbers to all pages except the cover
                        if (i > 1) {
                            doc.text(
                                `Page ${i-1}`,
                                doc.internal.pageSize.getWidth() / 2,
                                doc.internal.pageSize.getHeight() - 20,
                                { align: 'center' }
                            );
                        }
                    }
                    doc.save(`${activeOrg?.name || 'App'}_Handbook.pdf`);
                    toast.success("Handbook downloaded!", { id: toastId });
                    setIsGenerating(false);
                },
                margin: [40, 40, 40, 40],
                autoPaging: 'text',
                html2canvas: {
                    scale: 0.6, // Scale down for performance and to fit content
                    useCORS: true,
                    allowTaint: true,
                },
                width: 525, // A4 width in points minus margins
                windowWidth: 1200, // Render at a wider width to avoid cramped layouts
            });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("An error occurred while generating the PDF.", { id: toastId });
            setIsGenerating(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                    <BookOpen />
                    Administrator Handbook
                </h1>
                <button
                    onClick={generatePdf}
                    disabled={isGenerating}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                    {isGenerating ? <Spinner size="sm" /> : <Download size={16} />}
                    <span>{isGenerating ? 'Generating...' : 'Download as PDF'}</span>
                </button>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 handbook-viewer overflow-y-auto max-h-[calc(100vh-20rem)]">
                <div ref={contentRef}>
                    {processedChapters.map((chapter, index) => (
                        <div
                            key={index}
                            className="handbook-chapter"
                            dangerouslySetInnerHTML={{ __html: chapter.content }}
                        />
                    ))}
                </div>
            </div>
            
            <style>{/* CSS specifically for PDF generation and screen view */`
                .handbook-chapter {
                    /* Styles for screen view */
                }
                .handbook-chapter h2 {
                    margin-top: 2rem;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 0.5rem;
                }
                .handbook-chapter h3 {
                    margin-top: 1.5rem;
                }
                .handbook-chapter p, .handbook-chapter ul, .handbook-chapter ol {
                    margin-top: 1rem;
                }
                .handbook-chapter ul, .handbook-chapter ol {
                    padding-left: 2rem;
                }
                .handbook-chapter ul {
                    list-style-type: disc;
                }
                 .handbook-chapter ol {
                    list-style-type: decimal;
                }
                .handbook-chapter pre {
                    background-color: #f1f5f9;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    white-space: pre-wrap;
                    word-break: break-all;
                    margin-top: 1rem;
                }
                
                /* Styles for jspdf.html() to hint at page breaks */
                @media print {
                    .handbook-chapter {
                        page-break-before: always;
                    }
                }
                .handbook-chapter:first-child {
                    page-break-before: avoid;
                }
            `}
            </style>
        </div>
    );
};

export default Handbook;
