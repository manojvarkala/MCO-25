export const ch3_golden_workflow = `
    <h2 class="text-3xl font-bold font-display" id="ch3">Chapter 3: The Golden Workflow: Performance & Content</h2>

    <h3 class="text-xl font-bold mt-6">3.1 User Authentication & SSO Journey</h3>
    <p>The platform uses a secure Single Sign-On (SSO) model with WordPress as the central authentication authority. This ensures a seamless user experience and leverages WordPress's robust user management capabilities.</p>
    <ol>
        <li>A user clicks "Login" in the React app. They are redirected to a special <code>/exam-login/</code> page on the main WordPress site.</li>
        <li>If not already logged in, the user enters their standard WordPress credentials.</li>
        <li>Upon successful login, the <code>[mco_exam_login]</code> shortcode on that page generates a secure JSON Web Token (JWT).</li>
        <li>The user is immediately redirected back to the <code>/auth</code> route in the React app with the JWT included as a URL parameter.</li>
        <li>The React app's <code>AuthContext</code> validates the JWT's signature against the server's secret, decodes the user's details and permissions from the payload, saves the token to local storage, and establishes the user's session within the app.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">3.2 The JWT Payload</h3>
    <p>The JWT is the core of the user's session. It's a self-contained, digitally signed package of information that tells the app everything it needs to know about the user's identity and entitlements without needing to query the database on every action. A typical payload includes:</p>
    <ul>
        <li><strong>User Info:</strong> User ID, Display Name, Email, and an <code>isAdmin</code> flag.</li>
        <li><strong>Entitlements:</strong> An array of WooCommerce product SKUs the user has purchased (<code>paidExamIds</code>) and a boolean flag (<code>isSubscribed</code>) for active subscriptions.</li>
        <li><strong>Security Info:</strong> Standard JWT claims like expiration time (<code>exp</code>) and issuer (<code>iss</code>).</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">3.3 Initial App Load & Caching</h3>
    <p>The app uses a "Cache-First, Then Validate" strategy for lightning-fast load times.</p>
    <ol>
        <li><strong>Instant Load:</strong> On first visit, the app immediately tries to load the main configuration object from the browser's <code>localStorage</code>. If found, the UI renders instantly using this cached data.</li>
        <li><strong>Background Fetch:</strong> Simultaneously, the app makes an API call to the public <code>/config</code> endpoint on the WordPress backend.</li>
        <li><strong>Version Check & Update:</strong> The app compares the version timestamp of the cached data with the live data from the API. If the live version is newer, the app seamlessly updates its state, saves the new configuration to <code>localStorage</code>, and displays a subtle toast notification to the user that "Content and features have been updated."</li>
    </ol>
    <p>This ensures users always have an instant-loading experience while still receiving the latest content as soon as it's available.</p>

    <h3 class="text-xl font-bold mt-6">3.4 Exam Lifecycle: Start to Sync</h3>
    <p>The exam process is designed to be resilient and secure.</p>
    <ul>
        <li><strong>Start:</strong> When a user starts an exam, the app fetches the questions from the linked Google Sheet via a secure, cached backend proxy. Progress, answers, and the timer's end-time are saved to <code>localStorage</code>.</li>
        <li><strong>Progress:</strong> Every answer is immediately saved to <code>localStorage</code>, allowing a user to refresh the page or lose connection and resume exactly where they left off.</li>
        <li><strong>Submission:</strong> Upon submission, the result is first calculated and saved to the user's local results cache for immediate feedback.</li>
        <li><strong>Background Sync:</strong> The result is then sent to the WordPress backend in a background API call to be stored permanently in the user's meta fields. This dual-save approach ensures a fast UI while guaranteeing data integrity.</li>
    </ul>
`;
