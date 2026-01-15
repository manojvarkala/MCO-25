import React, { FC, useState, useRef, useEffect, useMemo } from 'react';
import { chapters } from './chapters.ts';
import { BookOpen, Download, ChevronLeft, ChevronRight, Search, List, Menu, X, FileText, Settings, Database, Sparkles, ShieldCheck } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(3); // Default to Ch 1 Intro
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const contentRef = useRef<HTMLDivElement>(null);
    const pdfHiddenRef = useRef<HTMLDivElement>(null);

    // Scroll to top on chapter change
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeChapterIndex]);

    const filteredChapters = useMemo(() => {
        if (!searchQuery) return chapters.slice(3); // Skip cover, title, toc
        return chapters.slice(3).filter(ch => 
            ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ch.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const generatePdf = async () => {
        if (!pdfHiddenRef.current) return;

        setIsGeneratingPdf(true);
        const toastId = toast.loading('Compiling Master Handbook PDF...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // Assemble ALL content into a hidden container with page breaks
            const fullHtml = chapters.map((ch, idx) => `
                <div style="padding: 50pt; page-break-after: always; font-family: sans-serif;">
                    <div style="color: #0891b2; font-size: 10pt; font-weight: bold; margin-bottom: 20pt; text-transform: uppercase;">
                        Annapoorna Infotech • Handbook Section ${idx + 1}
                    </div>
                    ${ch.content}
                </div>
            `).join('');

            pdfHiddenRef.current.innerHTML = fullHtml;

            await pdf.html(pdfHiddenRef.current, {
                callback: (doc) => {
                    doc.save('Annapoorna_Engine_Administrator_Handbook.pdf');
                    toast.success('Handbook Generated!', { id: toastId });
                    setIsGeneratingPdf(false);
                },
                x: 0,
                y: 0,
                width: pageWidth,
                windowWidth: 800, // Fixed width for consistent scaling
                autoPaging: 'text'
            });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Failed to compile PDF. Check console.', { id: toastId });
            setIsGeneratingPdf(false);
        }
    };

    const navItems = [
        { icon: <FileText size={16}/>, label: 'Core Concepts', range: [3, 5] },
        { icon: <ShieldCheck size={16}/>, label: 'User Guide', range: [6, 7] },
        { icon: <Settings size={16}/>, label: 'WP Admin', range: [8, 10] },
        { icon: <Database size={16}/>, label: 'In-App Admin', range: [11, 15] },
        { icon: <Sparkles size={16}/>, label: 'Special Topics', range: [16, 19] }
    ];

    return (
        <div className="flex flex-col lg:flex-row min-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            {/* HIDDEN PRINT CONTAINER */}
            <div ref={pdfHiddenRef} className="fixed -left-[9999px] top-0 w-[800px] bg-white text-slate-900 pointer-events-none"></div>

            {/* SIDEBAR NAVIGATION */}
            <aside className={`bg-slate-50 border-r border-slate-200 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'w-full lg:w-80' : 'w-0 lg:w-0 overflow-hidden'}`}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-600 rounded-xl text-white shadow-lg shadow-cyan-900/20">
                                <BookOpen size={20}/>
                            </div>
                            <span className="font-black text-slate-900 uppercase tracking-tighter">Documentation</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-500"><X /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search chapters..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                        />
                    </div>

                    <nav className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                        {navItems.map((group, gIdx) => (
                            <div key={gIdx}>
                                <h5 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">
                                    {group.icon} {group.label}
                                </h5>
                                <ul className="space-y-1">
                                    {chapters.map((ch, idx) => {
                                        if (idx < group.range[0] || idx > group.range[1]) return null;
                                        const isActive = activeChapterIndex === idx;
                                        return (
                                            <li key={idx}>
                                                <button
                                                    onClick={() => setActiveChapterIndex(idx)}
                                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                        isActive 
                                                            ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100' 
                                                            : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {ch.title.split(':').pop()?.trim()}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* TOOLBAR */}
                <header className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                        >
                            <Menu size={20}/>
                        </button>
                        <div className="hidden md:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section {activeChapterIndex - 2} of {chapters.length - 3}</p>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-xs">{chapters[activeChapterIndex].title}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={generatePdf}
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 disabled:opacity-50"
                        >
                            {isGeneratingPdf ? <Spinner size="sm" /> : <Download size={14} />}
                            {isGeneratingPdf ? 'Compiling...' : 'Export PDF'}
                        </button>
                    </div>
                </header>

                {/* CONTENT BROWSER */}
                <div ref={contentRef} className="flex-1 overflow-y-auto p-8 lg:p-16 custom-scrollbar scroll-smooth">
                    <article className="max-w-4xl mx-auto mco-handbook-prose">
                        <div dangerouslySetInnerHTML={{ __html: chapters[activeChapterIndex].content }} />
                        
                        <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center">
                            <button 
                                onClick={() => setActiveChapterIndex(prev => prev - 1)}
                                disabled={activeChapterIndex <= 3}
                                className="flex items-center gap-2 text-slate-400 hover:text-cyan-600 font-black text-xs uppercase tracking-widest disabled:opacity-0 transition"
                            >
                                <ChevronLeft size={16}/> Previous Chapter
                            </button>
                            <button 
                                onClick={() => setActiveChapterIndex(prev => prev + 1)}
                                disabled={activeChapterIndex >= chapters.length - 1}
                                className="flex items-center gap-2 text-cyan-600 hover:text-cyan-500 font-black text-xs uppercase tracking-widest disabled:opacity-0 transition"
                            >
                                Next Chapter <ChevronRight size={16}/>
                            </button>
                        </div>
                    </article>
                </div>
            </main>
        </div>
    );
};

export default Handbook;