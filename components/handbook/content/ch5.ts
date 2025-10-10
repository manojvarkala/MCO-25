export const ch5Content = `
    <h3 class="text-xl font-bold">5.1 Namespace and Endpoint Philosophy</h3>
    <p>All API routes for the application are consolidated under a single, versioned namespace: <code>/wp-json/mco-app/v1/</code>. This approach keeps the application's endpoints cleanly separated from WordPress core and other plugins.</p>
    <ul>
        <li><strong>Public Endpoints:</strong> The main <code>/config</code> endpoint is public, requires no authentication, and is heavily cached on the server to handle high traffic during initial app loads.</li>
        <li><strong>User-Protected Endpoints:</strong> Routes like <code>/user-results</code> and <code>/submit-result</code> require a valid JWT from a logged-in user.</li>
        <li><strong>Admin-Protected Endpoints:</strong> Routes under <code>/admin/</code> (e.g., <code>/admin/update-exam-program</code>) require a valid JWT from a user with administrator privileges.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">5.2 Security: JWT Authentication</h3>
    <p>The platform uses JSON Web Tokens (JWT) for secure, stateless authentication. This is superior to cookie-based sessions for a headless application.</p>
    <ol>
        <li>When a user logs in, the WordPress backend signs a JWT using a secret key (the <code>MCO_JWT_SECRET</code> defined in <code>wp-config.php</code>).</li>
        <li>This token is sent to the React app, which stores it securely.</li>
        <li>For every subsequent request to a protected API endpoint, the React app includes the JWT in the <code>Authorization: Bearer [token]</code> HTTP header.</li>
        <li>The WordPress backend verifies the token's signature using the same secret key. If the signature is valid and the token has not expired, the request is processed. If not, a 403 Forbidden error is returned.</li>
    </ol>
    <p><strong>Crucially, the <code>MCO_JWT_SECRET</code> must be a unique, long, and random string. It should never be shared or committed to version control.</strong></p>

    <h3 class="text-xl font-bold mt-6">5.3 Security: CORS and Troubleshooting</h3>
    <p>Cross-Origin Resource Sharing (CORS) is a security mechanism that browsers use to prevent a web page from making requests to a different domain than the one that served the page. Since our React app and WordPress backend are on different domains, we must explicitly configure CORS.</p>
    <p>The plugin handles this automatically by reading the "Exam Application URL(s)" from the Main Settings. It adds the necessary HTTP headers (<code>Access-Control-Allow-Origin</code>) to every API response, telling the browser that it's safe for the React app to access the data.</p>
    
    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
        <p class="font-bold text-amber-800">Troubleshooting "Authorization Header Missing" Errors</p>
        <p class="text-amber-700">The most common API connection issue is this error. It almost always means your web server (often Apache or LiteSpeed) is stripping the <code>Authorization</code> header from requests before they reach WordPress. To fix this, you must add the following code to the very top of your <code>.htaccess</code> file in the WordPress root directory:</p>
        <pre class="whitespace-pre-wrap bg-slate-100 p-2 rounded my-1 text-xs"><code>&lt;IfModule mod_rewrite.c&gt;
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
&lt;/IfModule&gt;</code></pre>
        <p class="text-amber-700 text-sm">After adding this, you must clear any server-side caching plugins.</p>
    </div>
`;
