import { coverContent } from './content/cover.ts';
import { titlePageContent } from './content/titlePage.ts';
import { tocContent } from './content/toc.ts';
import { ch1_introduction } from './content/ch1_introduction.ts';
import { ch2_architecture } from './content/ch2_architecture.ts';
import { ch3_golden_workflow } from './content/ch3_golden_workflow.ts';
import { ch4_user_guide_dashboard } from './content/ch4_user_guide_dashboard.ts';
import { ch5_user_guide_exams } from './content/ch5_user_guide_exams.ts';
import { ch6_wp_admin_setup } from './content/ch6_wp_admin_setup.ts';
import { ch7_wp_admin_content } from './content/ch7_wp_admin_content.ts';
import { ch8_wp_admin_tools } from './content/ch8_wp_admin_tools.ts';
import { ch9_in_app_admin_overview } from './content/ch9_in_app_admin_overview.ts';
import { ch10_in_app_admin_analytics } from './content/ch10_in_app_admin_analytics.ts';
import { ch11_in_app_admin_programs } from './content/ch11_in_app_admin_programs.ts';
import { ch12_in_app_admin_products } from './content/ch12_in_app_admin_products.ts';
import { ch13_in_app_admin_content_engine } from './content/ch13_in_app_admin_content_engine.ts';
import { ch14_onboarding_workflow } from './content/ch14_onboarding_workflow.ts';
import { ch15_plugin_integration } from './content/ch15_plugin_integration.ts';
import { ch16_monetization } from './content/ch16_monetization.ts';
import { ch17_visual_design } from './content/ch17_visual_design.ts';

export interface Chapter {
    title: string;
    content: string;
    isCover?: boolean;
}

export const chapters: Chapter[] = [
    { title: "Cover", content: coverContent, isCover: true },
    { title: "Title Page", content: titlePageContent },
    { title: "Table of Contents", content: tocContent },
    { title: "Part I: Core Concepts", content: ch1_introduction },
    { title: "Chapter 2: Architecture & Multi-Tenancy", content: ch2_architecture },
    { title: "Chapter 3: The Golden Workflow", content: ch3_golden_workflow },
    { title: "Part II: User Guide", content: ch4_user_guide_dashboard },
    { title: "Chapter 5: Taking Exams & Understanding Results", content: ch5_user_guide_exams },
    { title: "Part III: Administrator's Guide (WordPress)", content: ch6_wp_admin_setup },
    { title: "Chapter 7: Managing Content (CPTs & Bulk Import)", content: ch7_wp_admin_content },
    { title: "Chapter 8: Plugin Settings & Tools", content: ch8_wp_admin_tools },
    { title: "Part IV: Administrator's Guide (In-App)", content: ch9_in_app_admin_overview },
    { title: "Chapter 10: Sales Analytics", content: ch10_in_app_admin_analytics },
    { title: "Chapter 11: Exam Program Customizer", content: ch11_in_app_admin_programs },
    { title: "Chapter 12: Product Customizer", content: ch12_in_app_admin_products },
    { title: "Chapter 13: AI Content Engine", content: ch13_in_app_admin_content_engine },
    { title: "Part V: Onboarding & Development", content: ch14_onboarding_workflow },
    { title: "Chapter 15: Plugin Integration & Shortcodes", content: ch15_plugin_integration },
    { title: "Chapter 16: Monetization & Premium Access", content: ch16_monetization },
    { title: "Chapter 17: Visual Design & Grid Systems", content: ch17_visual_design },
];