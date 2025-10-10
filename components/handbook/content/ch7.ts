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
    <p>Also in the "Tools" tab, this second tool is for <strong>backups and performance optimization of an existing, live tenant</strong>. It generates a JSON file containing a complete, point-in-time snapshot of <strong>all your current live content</strong>—exams, books, prices, and settings. This file is a perfect backup and serves a key performance role, as explained in the workflow below.</p>

    <h3 class="text-xl font-bold mt-6">7.4 The "Golden Workflow" for Content Management and Optimization</h3>
    <p>Understanding the interplay between WordPress, the API, and the static JSON files is key to managing the platform professionally. Here is the definitive workflow:</p>
    <ol>
        <li><strong>Day-to-Day Content Management:</strong> ALL content updates (adding exams, changing prices, creating books) are done exclusively in the WordPress admin panel. The app will automatically fetch these changes via the live API, leveraging its caching system. <strong>You do not need to generate a new JSON file for daily updates.</strong></li>
        <li class="mt-2"><strong>Periodic Performance Optimization:</strong> Periodically (e.g., once a month or after a major content addition), follow these steps to improve the initial load speed for new visitors:
            <ul class="list-disc pl-5 mt-2">
                <li>Go to <strong>Exam App Engine → Tools</strong> and click <strong>"Generate Full Content Snapshot"</strong>.</li>
                <li>Download the fully populated JSON file.</li>
                <li>During your next planned deployment of the React app, replace the old static fallback file in the <code>/public</code> directory (e.g., <code>medical-coding-config.json</code>) with this new one.</li>
            </ul>
        </li>
    </ol>
    <p>By keeping the static fallback file reasonably up-to-date, you ensure that new users (or those with a cleared cache) have the fastest possible first-load experience, as the app can render the correct content instantly without waiting for the initial API call to complete.</p>
`;