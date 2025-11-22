export const ch10Content = `
    <h3 class="text-xl font-bold">10.1 A Guided Tour of the <code>/src</code> Directory</h3>
    <p>The frontend codebase is organized logically to ensure maintainability and scalability. The primary logic resides within the <code>/src</code> directory.</p>
    <ul>
        <li><strong><code>/assets</code>:</strong> Contains static assets like images, fonts, and reusable data structures that are not part of the main component logic.</li>
        <li><strong><code>/components</code>:</strong> The heart of the application. This directory contains all the React components that make up the user interface. It is further organized into subdirectories for complex features like the admin panel or handbook.</li>
        <li><strong><code>/context</code>:</strong> Home to the global state management solution. It contains the providers and hooks for <code>AuthContext</code> and <code>AppContext</code>.</li>
        <li><strong><code>/services</code>:</strong> This directory handles all external communication. It includes the API service for interacting with the WordPress backend and the configuration service for managing multi-tenancy.</li>
        <li><strong><code>/public</code>:</strong> Located at the project root, this directory contains static files that are served directly, such as the main <code>index.html</code>, CSS files, and the critical tenant-specific JSON configuration files.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">10.2 Key Component Files</h3>
    <p>While there are dozens of components, a few serve as the core pillars of the application's functionality:</p>
    <dl>
        <dt class="font-bold mt-4"><code>App.tsx</code></dt>
        <dd>The root component of the application. It sets up the main providers (<code>AuthProvider</code>, <code>AppProvider</code>), the router (<code>BrowserRouter</code>), and defines all the URL routes for the entire application.</dd>

        <dt class="font-bold mt-4"><code>Dashboard.tsx</code></dt>
        <dd>The main landing page for logged-in users. It displays user statistics, subscription offers, and the list of available exam programs.</dd>
        
        <dt class="font-bold mt-4"><code>Test.tsx</code></dt>
        <dd>The exam player. This complex component manages the exam timer, question loading, answer state, progress saving, and browser-based proctoring (fullscreen and focus monitoring).</dd>

        <dt class="font-bold mt-4"><code>Results.tsx</code></dt>
        <dd>Displays the user's score after an exam. It also contains the logic for triggering AI feedback, submitting reviews, and generating shareable result images.</dd>
        
        <dt class="font-bold mt-4"><code>Certificate.tsx</code></dt>
        <dd>Renders the HTML for the certificate and includes the logic for generating a downloadable PDF using <code>jsPDF</code> and <code>html2canvas</code>.</dd>
        
        <dt class="font-bold mt-4"><code>AdminLayout.tsx</code> & Admin Components</dt>
        <dd>The container for all administrator-only pages. Components like <code>ExamProgramCustomizer.tsx</code> and <code>SalesAnalytics.tsx</code> provide the powerful in-app management tools.</dd>
    </dl>
`;
