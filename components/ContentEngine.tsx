import React, { FC, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Send, Calendar, Clock, User, List, CheckCircle, ExternalLink } from 'lucide-react';
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
    const [interval, setInterval] = useState('1'); // in days
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

            try {
                // 1. Generate content with AI
                const aiContent = await googleSheetsService.generateAIPostContent(program.name, program.description);
                
                // 2. Prepare post data for WordPress
                const scheduleDate = new Date(startDate);
                scheduleDate.setDate(scheduleDate.getDate() + (i * parseInt(interval, 10)));
                const postDate = scheduleDate.toISOString().slice(0, 19).replace('T', ' ');

                const postPayload = {
                    program_id: program.id,
                    post_title: `Prepare for the ${program.name} Exam`,
                    post_content: aiContent,
                    post_status: 'future',
                    post_date: postDate,
                    post_author: authorId || undefined,
                    post_category: categoryId ? parseInt(categoryId, 10) : undefined
                };

                // 3. Send to WordPress to create the post
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
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display flex items-center gap-3">
                <Sparkles />
                AI Content Engine
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                Automatically generate and schedule SEO-friendly blog posts from your existing exam programs using the Gemini API.
            </p>

            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label htmlFor="num_posts" className="text-sm font-bold block mb-1">Posts to Create</label>
                        <input type="number" id="num_posts" value={numPosts} onChange={e => setNumPosts(e.target.value)} min="1" max="10" className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="start_date" className="text-sm font-bold block mb-1">Start Date</label>
                        <input type="date" id="start_date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="interval" className="text-sm font-bold block mb-1">Interval (Days)</label>
                        <input type="number" id="interval" value={interval} onChange={e => setInterval(e.target.value)} min="1" className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="author" className="text-sm font-bold block mb-1">Author</label>
                        <select id="author" value={authorId} onChange={e => setAuthorId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">Default (You)</option>
                            {postData?.authors.map(author => <option key={author.ID} value={author.ID}>{author.display_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="category" className="text-sm font-bold block mb-1">Category</label>
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">Uncategorized</option>
                            {/* FIX: Correctly map over the array of category objects instead of using Object.entries, which caused a type error. */}
                            {postData?.categories.map((category: WordpressCategory) => (
                                <option key={category.term_id} value={category.term_id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={handleGenerate} disabled={isGenerating} className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400">
                        {isGenerating ? <Spinner /> : <Send size={18} />}
                        {isGenerating ? 'Generating...' : 'Generate & Schedule Posts'}
                    </button>
                </div>
            </div>

            {(isGenerating || generatedPosts.length > 0) && (
                <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                    <h2 className="text-xl font-bold mb-4">Generation Log</h2>
                    {isGenerating && (
                        <div className="flex items-center gap-3 text-lg font-semibold text-blue-600">
                            <Spinner />
                            <p>{progressMessage}</p>
                        </div>
                    )}
                    {generatedPosts.length > 0 && (
                        <ul className="space-y-3">
                            {generatedPosts.map((post, index) => (
                                <li key={index} className="flex items-center justify-between p-3 bg-[rgb(var(--color-muted-rgb))] rounded-md">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={20} className="text-green-500" />
                                        <div>
                                            <p className="font-semibold">{post.title}</p>
                                            <p className="text-sm text-[rgb(var(--color-text-muted-rgb))]">Based on: {post.programName}</p>
                                        </div>
                                    </div>
                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--color-primary-rgb))] hover:underline">
                                        Edit Post <ExternalLink size={14} />
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