export const ch13Content = `
    <h3 class="text-xl font-bold">13.1 The "Cache-First, Then Validate" Strategy</h3>
    <p>The application's primary performance strategy is designed to deliver an instant-loading user experience while ensuring content remains up-to-date. This is achieved by prioritizing cached data for the initial render and then checking for updates in the background.</p>
    <p>This approach provides the perceived speed of a static site with the dynamism of a server-rendered application. The process is managed entirely within the <code>AppContext</code>.</p>

    <h3 class="text-xl font-bold mt-6">13.2 Client-Side Caching with <code>localStorage</code></h3>
    <p>The browser's <code>localStorage</code> is used as the first layer of cache. It is fast, persistent, and has a generous storage limit (typically 5-10MB).</p>
    <ul>
        <li><strong>How it Works:</strong> When the app successfully fetches the main configuration object from the API, it saves the entire JSON object as a string in <code>localStorage</code>, keyed by the tenant's API URL (e.g., <code>appConfigCache_https://www.coding-online.net</code>).</li>
        <li><strong>Benefit:</strong> On subsequent visits, the app can read this stored data synchronously before the first render, allowing the UI to appear almost instantly without any loading spinners.</li>
        <li><strong>Invalidation:</strong> The client-side cache is automatically invalidated whenever the version timestamp of the configuration fetched from the live API is newer than the cached version.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">13.3 Server-Side Caching with WordPress Transients</h3>
    <p>The WordPress backend uses its built-in caching mechanism, called Transients, to avoid expensive database queries on every API call. This significantly reduces server load and speeds up API response times.</p>
    <ul>
        <li><strong>How it Works:</strong> The first time the <code>/config</code> API endpoint is called, the <code>mco_get_app_config_data()</code> function runs. It queries all the necessary post types, taxonomies, and meta fields to build the large configuration object. It then saves this final object into a transient (e.g., <code>mco_app_config_data</code>) with an expiration time (typically 1 hour).</li>
        <li><strong>Benefit:</strong> For the next hour, any subsequent calls to the <code>/config</code> endpoint will receive the stored transient data almost instantly, without needing to touch the database at all.</li>
        <li><strong>Invalidation:</strong> The server-side cache is automatically invalidated in two ways:
            <ol>
                <li>It expires automatically after its set duration.</li>
                <li>Administrators can manually force an update by clicking the "Clear Server Config Cache" button in the plugin's "Tools" tab. This is the recommended action after making content changes in WordPress.</li>
            </ol>
        </li>
    </ul>
`;
