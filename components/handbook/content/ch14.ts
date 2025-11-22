export const ch14Content = `
    <h3 class="text-xl font-bold">14.1 The Dual Imperative: Live Content & Instant Performance</h3>
    <p>The Annapoorna Examination Engine is designed to achieve two seemingly contradictory goals: ensure that content is always up-to-date for active users, and deliver an instantaneous loading experience for new visitors. Understanding how the system balances these two priorities is key to managing it effectively. This is the "Golden Workflow."</p>
    <p>The platform operates in two distinct modes depending on the user's context.</p>

    <h3 class="text-xl font-bold mt-6">14.2 Mode 1: Live API Updates (For Your Logged-In, Active Users)</h3>
    <p>This is the "live mode" and represents the primary, day-to-day operation of the platform. It leverages the core power of the headless architecture.</p>
    <ul>
        <li><strong>How it works:</strong> When a user is logged into the React app, all configuration and content (exams, books, prices) are fetched directly from your WordPress API. If you make a change in the WordPress admin—like updating an exam's price or adding a new book—the server's cache for the API is cleared. The next time a user loads the app, it will fetch this new, updated information.</li>
        <li><strong>The Benefit:</strong> Your content is always live and up-to-date for your active user base. You can make changes on the fly, and they will be reflected in the app without requiring a redeployment. This is the core "headless" advantage.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">14.3 Mode 2: Static Fallback & The "Full Content Snapshot" (For New Visitors & Performance)</h3>
    <p>This is the "performance optimization mode." The main challenge with any API-driven app is the <strong>initial loading delay</strong> for a brand new visitor. Their browser has to load the app, make an API call, wait for the response, and then render the content. To eliminate this delay, we use a "static fallback" strategy.</p>
    <ul>
        <li><strong>How it works:</strong>
            <ol>
                <li>A brand new visitor arrives. The React app <strong>instantly</strong> loads a static JSON file (like <code>medical-coding-config.json</code>) that is bundled with the app itself.</li>
                <li>The app immediately renders the entire UI using this static, pre-loaded data. The site appears to load instantly.</li>
                <li><strong>In the background</strong>, the app then makes the live API call to your WordPress server to get the absolute latest content. If it finds any differences, it seamlessly updates the UI.</li>
            </ol>
        </li>
        <li><strong>The Role of the "Full Content Snapshot" Tool:</strong> The <strong>"Generate & Download Snapshot"</strong> button in your WordPress admin is your tool for keeping this static fallback file fresh. It allows you to take a complete snapshot of all your current live content and bundle it with the app for the next deployment.</li>
        <li><strong>The Benefit:</strong> This gives you the instant-loading feel of a static website with the dynamic power of a live backend.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">14.4 The Golden Workflow: The Definitive Process</h3>
    <p>Your content and performance management process is now simple and clear:</p>
    <ol>
        <li class="mt-2">
            <strong>For Daily Work:</strong> Make all your content changes (add exams, books, change prices) in <strong>WordPress</strong>. Logged-in users will see these updates automatically via the API. <strong>You do not need to generate a new JSON file for these daily changes.</strong>
        </li>
        <li class="mt-2">
            <strong>For Periodic Performance Optimization:</strong> Periodically (e.g., once a week, or after a major content update), you will:
            <ul class="list-disc pl-5 mt-2">
                <li>Go to <strong>Exam App Engine &rarr; Tools</strong> in your WordPress admin.</li>
                <li>Click the <strong>"Generate & Download Snapshot"</strong> button.</li>
                <li>Replace the old static JSON file in your React app's <code>/public</code> directory with this new, complete snapshot file.</li>
                <li>Redeploy your React app.</li>
            </ul>
        </li>
    </ol>
    <p>In summary: The API provides live updates by default. The snapshot tool is an additional optimization feature to make your site faster for new visitors by keeping the initial fallback data fresh.</p>
`;
