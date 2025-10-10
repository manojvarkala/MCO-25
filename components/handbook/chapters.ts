import { coverContent } from './content/cover';
import { titlePageContent } from './content/titlePage';
import { tocContent } from './content/toc';
import { ch1Content } from './content/ch1';
import { ch2Content } from './content/ch2';
import { ch3Content } from './content/ch3';
import { ch4Content } from './content/ch4';
import { ch5Content } from './content/ch5';
import { ch6Content } from './content/ch6';
import { ch7Content } from './content/ch7';
import { ch8Content } from './content/ch8';
import { ch9Content } from './content/ch9';
import { ch10Content } from './content/ch10';
import { ch11Content } from './content/ch11';
import { ch12Content } from './content/ch12';
import { ch13Content } from './content/ch13';
import { ch14Content } from './content/ch14';

export interface Chapter {
    title: string;
    content: string;
    isCover?: boolean;
}

export const chapters: Chapter[] = [
    { title: "Cover", content: coverContent, isCover: true },
    { title: "Title Page", content: titlePageContent },
    { title: "Table of Contents", content: tocContent },
    { title: "Chapter 1: Introduction", content: ch1Content },
    { title: "Chapter 2: High-Level Architecture", content: ch2Content },
    { title: "Chapter 3: Core Application Flow", content: ch3Content },
    { title: "Chapter 4: WordPress Backend (Part 1)", content: ch4Content },
    { title: "Chapter 5: WordPress Backend (Part 2)", content: ch5Content },
    { title: "Chapter 6: E-Commerce Integration", content: ch6Content },
    { title: "Chapter 7: Admin Panel", content: ch7Content },
    { title: "Chapter 8: AI & Automation", content: ch8Content },
    { title: "Chapter 9: Frontend Tech Stack", content: ch9Content },
    { title: "Chapter 10: Frontend Architecture", content: ch10Content },
    { title: "Chapter 11: Global State Management", content: ch11Content },
    { title: "Chapter 12: Multi-Tenancy in Practice", content: ch12Content },
    { title: "Chapter 13: Performance & Caching", content: ch13Content },
    { title: "Chapter 14: Onboarding a New Tenant", content: ch14Content },
];
