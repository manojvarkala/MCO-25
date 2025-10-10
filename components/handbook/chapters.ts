import { coverContent } from './content/cover.ts';
import { tocContent } from './content/toc.ts';
import { ch1Content } from './content/ch1.ts';
import { ch2Content } from './content/ch2.ts';
import { ch3Content } from './content/ch3.ts';
import { ch4Content } from './content/ch4.ts';
import { ch5Content } from './content/ch5.ts';
import { ch6Content } from './content/ch6.ts';
import { ch7Content } from './content/ch7.ts';
import { ch8Content } from './content/ch8.ts';
import { ch9Content } from './content/ch9.ts';
import { ch10Content } from './content/ch10.ts';
import { ch11Content } from './content/ch11.ts';
import { ch12Content } from './content/ch12.ts';
import { ch13Content } from './content/ch13.ts';
import { ch14Content } from './content/ch14.ts';

interface Chapter {
    id: string;
    title: string;
    content: string;
    isCover?: boolean;
}

const chapterMetadata: Omit<Chapter, 'content' | 'isCover'>[] = [
    { id: 'cover', title: 'Cover Page' },
    { id: 'toc', title: 'Table of Contents' },
    { id: 'ch1', title: 'Chapter 1: Introduction' },
    { id: 'ch2', title: 'Chapter 2: The Headless, Multi-Tenant Model' },
    { id: 'ch3', title: 'Chapter 3: The End-to-End Data Flow' },
    { id: 'ch4', title: 'Chapter 4: Plugin Core & Content Structure' },
    { id: 'ch5', title: 'Chapter 5: The REST API & Security Model' },
    { id: 'ch6', title: 'Chapter 6: WooCommerce Integration' },
    { id: 'ch7', title: 'Chapter 7: Content & Data Management' },
    { id: 'ch8', title: 'Chapter 8: The AI Content Engine Backend' },
    { id: 'ch9', title: 'Chapter 9: Technology Stack & Project Setup' },
    { id: 'ch10', title: 'Chapter 10: Project Structure & Key Components' },
    { id: 'ch11', title: 'Chapter 11: State Management' },
    { id: 'ch12', title: 'Chapter 12: Multi-Tenant Implementation' },
    { id: 'ch13', title: 'Chapter 13: Caching & Performance Strategy' },
    { id: 'ch14', title: 'Chapter 14: Onboarding a New Tenant' },
];

const allContent: Record<string, string> = {
    cover: coverContent,
    toc: tocContent(chapterMetadata), // Pass metadata to generate TOC
    ch1: ch1Content,
    ch2: ch2Content,
    ch3: ch3Content,
    ch4: ch4Content,
    ch5: ch5Content,
    ch6: ch6Content,
    ch7: ch7Content,
    ch8: ch8Content,
    ch9: ch9Content,
    ch10: ch10Content,
    ch11: ch11Content,
    ch12: ch12Content,
    ch13: ch13Content,
    ch14: ch14Content,
};

export const chapters: Chapter[] = chapterMetadata.map(meta => ({
    ...meta,
    content: allContent[meta.id] || '<p>Content not found.</p>',
    isCover: meta.id === 'cover',
}));
