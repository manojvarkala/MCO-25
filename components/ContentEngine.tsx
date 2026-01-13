import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Send, Calendar, Clock, User, List, CheckCircle, ExternalLink, Key, Hash, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppContext } from '../context/AppContext.tsx';
import { googleSheetsService } from '../services/googleSheetsService.ts';
import type { PostCreationData, WordpressAuthor, WordpressCategory } from '../types.ts';
import Spinner from './Spinner.tsx';

interface GeneratedPost {
    title: string;
    url: string;
    programName: string;
}

const ContentEngine: FC = () => {
    const { token } = useAuth();
    const { activeOrg } = useAppContext();
    const [isReady, setIsReady] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [postData, setPostData] = useState<PostCreationData | null>(null);
    const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
    const [progressMessage, setProgressMessage] = useState('');

    // Form state
    const [numPosts, setNumPosts] = useState('3');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [interval, setInterval] = useState('1'); // in days
    const [intervalUnit, setIntervalUnit] = useState<'hours' | 'days' | 'weeks'>('days');
    const [keywords, setKeywords] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [authorId, setAuthorId] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!token) return;
            try {
                const data = await googleSheetsService.getPostCreationData(token);
                setPostData(data);
                setIsReady(true);
            } catch (error: any) {
                toast.error(`Failed to load authors/categories: ${error.message}`);
            }
        };
        fetchInitialData();
    }, [token]);

    const eligiblePrograms = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.examProductCategories
            .filter(p => p.certificationExamId && p.description) // Must have a cert exam and description
            .map(p => ({
                id: p.id.replace('prod-', ''), // Get the raw post ID
                appId: p.id,
                name: p.name,
                description: p.description
            }));
    }, [activeOrg]);

    const handleGenerate = async () => {
        if (!token) { toast.error("Authentication Error"); return; }
        if (eligiblePrograms.length === 0) { toast.error("No eligible exam programs to create posts from."); return; }

        setIsGenerating(true);
        setGeneratedPosts([]);
        
        const num = parseInt(numPosts, 10);
        const shuffledPrograms = [...eligiblePrograms].sort(() => 0.5 - Math.random());
        const programsToPost = shuffledPrograms.slice(0, num);

        for (let i = 0; i < programsToPost.length; i++) {
            const program = programsToPost[i];
            setProgressMessage(`Generating post ${i + 1} of ${programsToPost.length} for "${program.name}"...`);
            
            if (!program || !program.appId) {
                toast.error(`Skipping post for "${program.name}" due to missing program ID.`);
                continue; // Skip this iteration
            }

            try {
                // 1. Generate content with AI
                const aiContent = await googleSheetsService.generateAIPostContent(program.name, program.description, keywords, hashtags);
                
                // 2. Prepare post data for WordPress
                const baseScheduleDate = new Date(`${startDate}T${startTime}`);
                const scheduleDate = new Date(baseScheduleDate);

                const intervalValue = parseInt(interval, 10);
                if (intervalUnit === 'days') {
                    scheduleDate.setDate(scheduleDate.getDate() + (i * intervalValue));
                } else if (intervalUnit === 'hours') {
                    scheduleDate.setHours(scheduleDate.getHours() + (i * intervalValue));
                } else if (intervalUnit === 'weeks') {
                    scheduleDate.setDate(scheduleDate.getDate() + (i * intervalValue * 7));
                }
                
                const postDate = scheduleDate.toISOString().slice(0, 19).replace('T', ' ');

                // 3. Create the dynamic Call-To-Action block with the CORRECT URL
                const programUrl = `${window.location.origin}/program/${program.appId}`;
                const ctaBlock = `
<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}},"border":{"radius":"8px"}},"backgroundColor":"vivid-cyan-blue","textColor":"white","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-white-color has-vivid-cyan-blue-background-color has-text-color has-background" style="border-radius:8px;padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">
<!-- wp:heading {"textAlign":"center","level":3,"textColor":"white"} -->
<h3 class="wp-block-heading has-text-align-center has-white-color has-text-color">Ready to Get Certified?</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Take the next step in your career. Explore our practice tests, certification exams, and valuable bundles for the ${program.name}.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"luminous-vivid-amber","textColor":"black","className":"is-style-fill"} -->
<div class="wp-block-button is-style-fill">
<a class="wp-block-button__link has-black-color has-luminous-vivid-amber-background-color has-text-color has-background" href="${programUrl}" rel="noopener">View the Program Details</a>
</div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
`;

                const postPayload = {
                    program_id: program.id,
                    post_title: `How to Prepare for the ${program.name} Exam`,
                    post_content: aiContent.trim() + '\n\n' + ctaBlock.trim(),
                    post_status: 'future',
                    post_date: postDate,
                    post_author: authorId || undefined,
                    post_category: categoryId ? parseInt(categoryId, 10) : undefined,
                    keywords: keywords,
                    hashtags: hashtags
                };

                // 4. Send to WordPress to create the post
                const result = await googleSheetsService.createPostFromApp(token, postPayload);
                if (result.success) {
                    setGeneratedPosts(prev => [...prev, { title: postPayload.post_title, url: result.post_url, programName: program.name }]);
                } else {
                    throw new Error("Server failed to create post.");
                }

            } catch (error: any) {
                toast.error(`Failed to generate post for "${program.name}": ${error.message}`);
                // Stop the whole process on failure
                setIsGenerating(false);
                setProgressMessage('');
                return;
            }
        }
        
        toast.success(`${programsToPost.length} posts scheduled successfully!`);
        setIsGenerating(false);
        setProgressMessage('');
    };

    if (!isReady) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white font-display flex items-center gap-3">
                <Sparkles className="text-cyan-500" />
                AI Content Engine
            </h1>
            <p className="text-slate-300 text-lg">
                Automatically generate and schedule SEO-friendly blog posts from your existing exam programs using the Gemini API.
            </p>

            <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1: Scheduling */}
                    <div className="space-y-5">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                            <Calendar size={14} className="text-cyan-500"/> Scheduling Configuration
                        </h3>
                        <div>
                            <label htmlFor="num_posts" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Posts to Create</label>
                            <input type="number" id="num_posts" value={numPosts} onChange={e => setNumPosts(e.target.value)} min="1" max={eligiblePrograms.length} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start_date" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Launch Date</label>
                                <input type="date" id="start_date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 transition-colors" />
                            </div>
                            <div>
                                <label htmlFor="start_time" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Start Time</label>
                                <input type="time" id="start_time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Drip Frequency</label>
                            <div className="flex gap-2">
                                <input type="number" id="interval" value={interval} onChange={e => setInterval(e.target.value)} min="1" className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white" />
                                <select id="interval_unit" value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as any)} className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white font-bold">
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                    <option value="weeks">Weeks</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Content & SEO */}
                    <div className="space-y-5">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                            <Key size={14} className="text-cyan-500"/> Content & SEO Hooks
                        </h3>
                        <div>
                            <label htmlFor="keywords" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 flex items-center gap-1">Keywords</label>
                            <input type="text" id="keywords" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. medical coding, cpc exam" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 placeholder:text-slate-700" />
                            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase italic">Comma-separated for AI indexing.</p>
                        </div>
                        <div>
                            <label htmlFor="hashtags" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 flex items-center gap-1">Hashtags</label>
                            <input type="text" id="hashtags" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="CPCPrep, CertifiedCoder" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-cyan-500 placeholder:text-slate-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="author" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">WordPress Author</label>
                                <select id="author" value={authorId} onChange={e => setAuthorId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white font-bold">
                                    <option value="">Default Admin</option>
                                    {postData?.authors.map(author => <option key={author.ID} value={author.ID}>{author.display_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="category" className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">WordPress Category</label>
                                <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white font-bold">
                                    <option value="">Uncategorized</option>
                                    {postData?.categories.map((category: WordpressCategory) => (
                                        <option key={category.term_id} value={category.term_id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-10 pt-8 border-t border-slate-800 text-right">
                    <button onClick={handleGenerate} disabled={isGenerating} className="inline-flex items-center justify-center gap-3 px-10 py-4 border border-transparent text-sm font-black rounded-xl shadow-lg text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all uppercase tracking-widest">
                        {isGenerating ? <Spinner size="sm" /> : <Send size={18} />}
                        {isGenerating ? 'AI Dispatching...' : 'Initiate Post Generation'}
                    </button>
                </div>
            </div>

            {(isGenerating || generatedPosts.length > 0) && (
                <div className="bg-slate-950 p-8 rounded-2xl shadow-2xl border border-slate-800">
                    <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tighter">System Output Logs</h2>
                    {isGenerating && (
                        <div className="flex items-center gap-3 text-lg font-bold text-cyan-400 animate-pulse mb-6">
                            <Spinner />
                            <p>{progressMessage}</p>
                        </div>
                    )}
                    {generatedPosts.length > 0 && (
                        <ul className="space-y-4">
                            {generatedPosts.map((post, index) => (
                                <li key={index} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-cyan-900 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <CheckCircle size={24} className="text-emerald-500" />
                                        <div>
                                            <p className="font-black text-white">{post.title}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Source: {post.programName}</p>
                                        </div>
                                    </div>
                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black text-cyan-500 bg-cyan-950/30 px-4 py-2 rounded-lg hover:bg-cyan-500 hover:text-white transition-all">
                                        EDIT IN WP <ExternalLink size={12} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContentEngine;