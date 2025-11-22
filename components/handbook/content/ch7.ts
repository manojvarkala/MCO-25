export const ch7Content = `
    <h3 class="text-xl font-bold">7.1 The Admin Panel Overview</h3>
    <p>The "Exam App Engine" menu in the WordPress admin dashboard is the central control panel for all backend content and configuration. It is organized into several tabs for clarity and ease of use.</p>
    <ul>
        <li><strong>Main Settings:</strong> Configure essential links like the React App URL, add a custom logo, and toggle global features like the "Spin & Win" game.</li>
        <li><strong>Theme Selector:</strong> Set the default visual theme for the entire tenant application.</li>
        <li><strong>Bulk Import:</strong> A powerful tool for creating or updating hundreds of Exam Programs or Recommended Books from a single CSV file upload.</li>
        <li><strong>Certificate Templates:</strong> A visual editor for creating and modifying the PDF certificates issued to users upon passing an exam.</li>
        <li><strong>Tools:</strong> Contains essential utilities for maintenance and onboarding new clients.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">7.2 The Tenant Blueprint Generator</h3>
    <p>Located in the "Tools" tab, this tool is for <strong>launching a brand new tenant portal</strong>. It generates a complete, error-free JSON configuration file with all necessary branding and templates, but with <strong>empty content arrays</strong> (no exams, books, etc.). This gives the React app the basic "scaffolding" it needs to start up for a new, empty tenant without crashing.</p>
    
    <h3 class="text-xl font-bold mt-6">7.3 The Full Content Snapshot Generator</h3>
    <p>Also in the "Tools" tab, this second tool is for <strong>backups and performance optimization of an existing, live tenant</strong>. It generates a JSON file containing a complete, point-in-time snapshot of <strong>all your current live content</strong>—exams, books, prices, and settings. This file is a perfect backup and serves a key performance role.</p>

    <h3 class="text-xl font-bold mt-6">7.4 The "Golden Workflow": A Brief Overview</h3>
    <p>Understanding the interplay between WordPress, the live API, and the static JSON files is key to managing the platform professionally. In short:</p>
    <ul>
        <li><strong>Daily content changes</strong> are made in WordPress and are reflected <strong>live in the app via the API</strong> for logged-in users.</li>
        <li>The <strong>Full Content Snapshot</strong> is used periodically to update the app's static fallback file, ensuring the <strong>fastest possible initial load time</strong> for new visitors.</li>
    </ul>
    <p>For a complete, detailed explanation of this crucial workflow, please refer to <strong><a href="#chapter-16">Chapter 14: The Golden Workflow: Performance & Content Management</a></strong>.</p>
`;
