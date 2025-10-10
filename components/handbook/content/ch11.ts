export const ch11Content = `
    <h3 class="text-xl font-bold">11.1 The Role of React Context</h3>
    <p>For a complex application, many different components need access to the same pieces of information (like who the user is, or what brand's portal is being viewed). Instead of passing this data down through every single component (a process called "prop drilling"), we use React's Context API.</p>
    <p>Think of a Context as a central information desk for a section of the application. Any component that needs information can go directly to the desk to get it, without having to ask every component above it in the hierarchy. This makes the code much cleaner, more efficient, and easier to maintain.</p>
    <p>Our application uses two primary contexts that wrap the entire application in <code>App.tsx</code>.</p>

    <h3 class="text-xl font-bold mt-6">11.2 <code>AuthContext</code>: Managing the User Session</h3>
    <p>The <code>AuthContext</code> is responsible for everything related to the user's identity and permissions. It acts as the single source of truth for:</p>
    <ul>
        <li><strong>User Object:</strong> The current user's ID, name, and email.</li>
        <li><strong>Authentication Token:</strong> The JWT received from WordPress.</li>
        <li><strong>Permissions & Entitlements:</strong> The list of purchased exam SKUs (<code>paidExamIds</code>) and the user's subscription status (<code>isSubscribed</code>).</li>
        <li><strong>Masquerade Mode:</strong> The state for the admin feature that allows viewing the app as a regular user or a visitor.</li>
        <li><strong>Core Functions:</strong> It provides the functions that components can call to perform actions like <code>loginWithToken()</code> and <code>logout()</code>.</li>
    </ul>
    <p>Any component can access this information by using the <code>useAuth()</code> hook, which provides a direct line to the "authentication desk."</p>
    
    <h3 class="text-xl font-bold mt-6">11.3 <code>AppContext</code>: Managing Tenant Configuration and UI State</h3>
    <p>The <code>AppContext</code> is responsible for everything related to the application's overall state and the specific tenant being viewed. It manages:</p>
    <ul>
        <li><strong>Tenant Configuration (<code>activeOrg</code>):</strong> The complete configuration object for the current tenant, including their name, logo, list of exams, books, and certificate templates.</li>
        <li><strong>Loading & Initialization State:</strong> Flags like <code>isInitializing</code> that tell other components whether the initial data load is complete.</li>
        <li><strong>Global UI State:</strong> The currently selected theme (<code>activeTheme</code>) and the state of modals like the "Spin & Win" wheel.</li>
        <li><strong>Caching Logic:</strong> It contains the logic for loading the configuration from <code>localStorage</code> first and then validating it against the live API.</li>
    </ul>
    <p>Components use the <code>useAppContext()</code> hook to get information from this "application desk," allowing them to render the correct branding, content, and theme for the current tenant.</p>
`;
