import React, { FC, useState, useRef, useEffect, useMemo } from 'react';
import { chapters } from './chapters.ts';
import { BookOpen, Download, ChevronLeft, ChevronRight, Search, Menu, X, FileText, Settings, Database, Sparkles, ShieldCheck } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Handbook: FC = () => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(3); // Default to Ch 1 Intro
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const contentRef = useRef<HTMLDivElement>(null);
    const snapshotRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeChapterIndex]);

    const generatePdf = async () => {
        if (!snapshotRef.current) return;

        setIsGeneratingPdf(true);
        const toastId = toast.loading('Initiating Master PDF Sequence...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = 210; // A4 Width in mm
            const pdfHeight = 297; // A4 Height in mm
            
            // Loop through ALL chapters and capture snapshots
            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                toast.loading(`Capturing Chapter ${i + 1}: ${ch.title.split(':').pop()?.trim()}`, { id: toastId });

                // Render chapter to the hidden snapshot div
                snapshotRef.current.innerHTML = `
                    <div style="padding: 40px; background: white; color: black; font-family: sans-serif; width: 800px;">
                        <div style="font-size: 10px; color: #0891b2; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 30px;">
                            ANNAPOORNA ENGINE • ADMINISTRATOR HANDBOOK • CHAPTER ${i + 1}
                        </div>
                        ${ch.content}
                    </div>
                `;

                // Give the browser a micro-moment to layout
                await new Promise(r => setTimeout(r, 100));

                const canvas = await html2canvas(snapshotRef.current, {
                    scale: 2, // High resolution
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                
                // Add page
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save('Annapoorna_Engine_Master_Handbook.pdf');
            toast.success('Handbook Exported Successfully!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Export failed. Check console for details.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (snapshotRef.current) snapshotRef.current.innerHTML = ''; // Cleanup
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
        <div className="flex flex-col lg:flex-row min-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-300">
            {/* HIDDEN SNAPSHOT CONTAINER - Needs to be partially visible for html2canvas sometimes, but moved far off screen */}
            <div 
                ref={snapshotRef} 
                className="fixed -top-[10000px] left-0 bg-white" 
                style={{ width: '800px' }}
            ></div>

            {/* SIDEBAR NAVIGATION */}
            <aside className={`bg-slate-100 border-r border-slate-300 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'w-full lg:w-80' : 'w-0 lg:w-0 overflow-hidden'}`}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-xl">
                                <BookOpen size={20}/>
                            </div>
                            <span className="font-black text-slate-900 uppercase tracking-tighter text-lg">Documentation</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-900"><X /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search chapters..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border-2 border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-cyan-600 focus:ring-0 transition-all"
                        />
                    </div>

                    <nav className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                        {navItems.map((group, gIdx) => (
                            <div key={gIdx}>
                                <h5 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2 border-b border-slate-200 pb-2">
                                    {group.icon} {group.label}
                                </h5>
                                <ul className="space-y-1.5">
                                    {chapters.map((ch, idx) => {
                                        if (idx < group.range[0] || idx > group.range[1]) return null;
                                        const isActive = activeChapterIndex === idx;
                                        return (
                                            <li key={idx}>
                                                <button
                                                    onClick={() => setActiveChapterIndex(idx)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-black transition-all border-2 ${
                                                        isActive 
                                                            ? 'bg-white text-cyan-700 border-cyan-500 shadow-md translate-x-1' 
                                                            : 'text-slate-600 border-transparent hover:bg-slate-200 hover:text-slate-900'
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
                <header className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 text-slate-900 hover:bg-white rounded-xl border-2 border-slate-200 transition shadow-sm"
                        >
                            <Menu size={20}/>
                        </button>
                        <div className="hidden md:block">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section {activeChapterIndex - 2}</p>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-xs">{chapters[activeChapterIndex].title}</h2>
                        </div>
                    </div>

                    <button
                        onClick={generatePdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-xl disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Spinner size="sm" /> : <Download size={14} />}
                        {isGeneratingPdf ? 'Processing...' : 'Export Master PDF'}
                    </button>
                </header>

                {/* CONTENT BROWSER */}
                <div ref={contentRef} className="flex-1 overflow-y-auto p-10 lg:p-20 custom-scrollbar scroll-smooth">
                    <article className="max-w-4xl mx-auto mco-handbook-prose animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div dangerouslySetInnerHTML={{ __html: chapters[activeChapterIndex].content }} />
                        
                        <div className="mt-24 pt-12 border-t-2 border-slate-100 flex justify-between items-center pb-12">
                            <button 
                                onClick={() => setActiveChapterIndex(prev => prev - 1)}
                                disabled={activeChapterIndex <= 3}
                                className="flex items-center gap-2 text-slate-400 hover:text-cyan-600 font-black text-xs uppercase tracking-widest disabled:opacity-0 transition group"
                            >
                                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Previous Chapter
                            </button>
                            <button 
                                onClick={() => setActiveChapterIndex(prev => prev + 1)}
                                disabled={activeChapterIndex >= chapters.length - 1}
                                className="flex items-center gap-2 text-cyan-600 hover:text-cyan-800 font-black text-xs uppercase tracking-widest disabled:opacity-0 transition group"
                            >
                                Next Chapter <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                            </button>
                        </div>
                    </article>
                </div>
            </main>
        </div>
    );
};

export default Handbook;