import React, { FC, useState, useRef, useEffect, useMemo } from 'react';
import { chapters } from './chapters.ts';
import { BookOpen, Download, ChevronLeft, ChevronRight, Search, Menu, X, FileText, Settings, Database, Sparkles, ShieldCheck, Layers, Award } from 'lucide-react';
import Spinner from '../Spinner.tsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext.tsx';

// FIX: Corrected component syntax and fixed malformed template literals in classNames and string interpolations.
const Handbook: FC = () => {
    const { activeOrg } = useAppContext();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeChapterIndex, setActiveChapterIndex] = useState(3); // Default to Ch 1 Intro
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const contentRef = useRef<HTMLDivElement>(null);
    const snapshotRef = useRef<HTMLDivElement>(null);

    // Domain Check: Only show medical coding spec on the MCO domain
    const isMedicalCodingDomain = activeOrg?.id === 'org-medical-coding-online';

    // Strictly compute available chapters based on domain
    const availableChapters = useMemo(() => {
        return chapters.filter(ch => {
            const isSpecChapter = ch.title.toLowerCase().includes('medical coding specialization');
            if (isSpecChapter) {
                return isMedicalCodingDomain;
            }
            return true;
        });
    }, [isMedicalCodingDomain]);

    // Ensure we don't land on a missing page if the org changes
    useEffect(() => {
        if (activeChapterIndex >= availableChapters.length) {
            setActiveChapterIndex(availableChapters.length - 1);
        }
    }, [availableChapters, activeChapterIndex]);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeChapterIndex]);

    const generatePdf = async () => {
        if (!snapshotRef.current) return;

        setIsGeneratingPdf(true);
        const toastId = toast.loading('Assembling Handbook Assets...');

        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = 210; 
            const pdfHeight = 297; 
            
            for (let i = 0; i < availableChapters.length; i++) {
                const ch = availableChapters[i];
                toast.loading(`Capturing: ${ch.title}`, { id: toastId });

                const showHeader = i > 0;
                const sectionTitle = i < 3 ? 'Preliminary' : `Section ${i - 2}`;

                snapshotRef.current.innerHTML = `
                    <div style="padding: 50px; background: white; color: #0f172a; font-family: 'Inter', sans-serif; width: 800px; min-height: 1130px; display: flex; flex-direction: column;">
                        ${showHeader ? `
                        <div style="font-size: 11px; color: #0891b2; font-weight: 900; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 35px; display: flex; justify-content: space-between; text-transform: uppercase; letter-spacing: 1px;">
                            <span>Annapoorna Advantage Handbook</span>
                            <span>${sectionTitle} • ${ch.title.split(':').pop()?.trim()}</span>
                        </div>
                        ` : ''}
                        <div class="mco-handbook-prose" style="flex: 1;">
                            ${ch.content}
                        </div>
                        <div style="margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 10px; color: #94a3b8; text-align: center;">
                            © ${new Date().getFullYear()} Annapoorna Infotech • Page ${i + 1}
                        </div>
                    </div>
                `;

                await new Promise(r => setTimeout(r, 150));

                const canvas = await html2canvas(snapshotRef.current, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.92);
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            // FIX: Corrected template literal escaping
            pdf.save(`Annapoorna_Advantage_Handbook.pdf`);
            toast.success('Handbook Exported Successfully!', { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error('Export failed. Please try again.', { id: toastId });
        } finally {
            setIsGeneratingPdf(false);
            if (snapshotRef.current) snapshotRef.current.innerHTML = '';
        }
    };

    const navGroups = [
        { icon: <FileText size={16}/>, label: 'Core Concepts', range: [3, 5] },
        { icon: <ShieldCheck size={16}/>, label: 'User Guide', range: [6, 7] },
        { icon: <Settings size={16}/>, label: 'WP Admin', range: [8, 10] },
        { icon: <Database size={16}/>, label: 'In-App Admin', range: [11, 15] },
        { icon: <Layers size={16}/>, label: 'Implementation', range: [16, 19] },
        ...(isMedicalCodingDomain ? [{ icon: <Award size={16}/>, label: 'Coding Specialization', range: [20, 20] }] : [])
    ];

    return (
        <div className="flex flex-col lg:flex-row min-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            <div 
                ref={snapshotRef} 
                className="fixed -top-[20000px] left-0 bg-white" 
                style={{ width: '800px' }}
            ></div>

            {/* SIDEBAR */}
            {/* FIX: Fixed malformed className template literal */}
            <aside className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'w-full lg:w-80' : 'w-0 lg:w-0 overflow-hidden'}`}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-cyan-600 rounded-xl text-white shadow-lg shadow-cyan-500/20">
                                <BookOpen size={20}/>
                            </div>
                            <span className="font-black text-white uppercase tracking-tighter text-lg">Advantage Docs</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400"><X /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search Handbook..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-200 focus:border-cyan-500 focus:ring-0 transition-all"
                        />
                    </div>

                    <nav className="flex-grow overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                        {navGroups.map((group, gIdx) => (
                            <div key={gIdx}>
                                {/* FIX: Fixed malformed className template literal */}
                                <h5 className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3 px-2 ${group.label === 'Coding Specialization' ? 'text-amber-500' : 'text-slate-500'}`}>
                                    {group.icon} {group.label}
                                </h5>
                                <ul className="space-y-1">
                                    {chapters.map((ch, originalIdx) => {
                                        if (originalIdx < group.range[0] || originalIdx > group.range[1]) return null;
                                        
                                        const isAvailable = availableChapters.some(ac => ac.title === ch.title);
                                        if (!isAvailable) return null;

                                        const currentIdxInAvailable = availableChapters.findIndex(ac => ac.title === ch.title);
                                        const isActive = activeChapterIndex === currentIdxInAvailable;

                                        return (
                                            <li key={originalIdx}>
                                                <button
                                                    onClick={() => setActiveChapterIndex(currentIdxInAvailable)}
                                                    // FIX: Fixed malformed className template literal
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black transition-all border-l-4 ${
                                                        isActive 
                                                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500 shadow-sm' 
                                                            : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
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

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                <header className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                        >
                            <Menu size={20}/>
                        </button>
                        <div className="hidden md:block">
                            <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Annapoorna Advantage Handbook</p>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-xs">{availableChapters[activeChapterIndex]?.title || 'Loading...'}</h2>
                        </div>
                    </div>

                    <button
                        onClick={generatePdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-xl disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Spinner size="sm" /> : <Download size={14} />}
                        {isGeneratingPdf ? 'Processing...' : 'Export Handbook'}
                    </button>
                </header>

                <div ref={contentRef} className="flex-1 overflow-y-auto p-10 lg:p-20 custom-scrollbar scroll-smooth">
                    <article className="max-w-4xl mx-auto mco-handbook-prose p-12 bg-white rounded-3xl shadow-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div dangerouslySetInnerHTML={{ __html: availableChapters[activeChapterIndex]?.content || '' }} />
                        
                        <div className="mt-24 pt-12 border-t border-slate-100 flex justify-between items-center">
                            <button 
                                onClick={() => setActiveChapterIndex(prev => prev - 1)}
                                disabled={activeChapterIndex <= 3}
                                className="flex items-center gap-2 text-slate-400 hover:text-cyan-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-0 transition group"
                            >
                                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> Previous
                            </button>
                            <button 
                                onClick={() => setActiveChapterIndex(prev => prev + 1)}
                                disabled={activeChapterIndex >= availableChapters.length - 1}
                                className="flex items-center gap-2 text-cyan-600 hover:text-cyan-800 font-black text-[10px] uppercase tracking-widest disabled:opacity-0 transition group"
                            >
                                Next <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                            </button>
                        </div>
                    </article>
                </div>
            </main>
        </div>
    );
};

export default Handbook;