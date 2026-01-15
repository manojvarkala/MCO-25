export const ch16_monetization = `
    <h2 class="text-3xl font-bold font-display" id="ch16">Chapter 16: Monetization & Custom Access Logic</h2>
    
    <h3 class="text-xl font-bold mt-6">16.1 Moving Beyond WC Subscriptions</h3>
    <p>To reduce infrastructure costs and increase flexibility, the Annapoorna Engine now includes a native <strong>Premium Access Engine</strong>. This allows organizations to sell "Time-Limited Premium Access" without the complexity of the official WooCommerce Subscriptions extension.</p>

    <h3 class="text-xl font-bold mt-6">16.2 The Custom Order Hook</h3>
    <p>The core of this logic is the <code>mco_handle_custom_addon_access</code> function in the <code>mco-api-handlers.php</code> file. It listens for the <code>woocommerce_order_status_completed</code> hook and performs the following steps:</p>
    <ol>
        <li><strong>SKU Scanning:</strong> Scans the completed order for any product SKU containing the string <code>-1mo-addon</code>.</li>
        <li><strong>Expiry Calculation:</strong>
            <ul class="list-disc pl-5 mt-1">
                <li>If the user has no current access, it sets the expiry to <strong>30 Days from Today</strong>.</li>
                <li>If the user has active access, it <strong>Stacks</strong> the time, adding 30 days to the <em>existing</em> expiration timestamp.</li>
            </ul>
        </li>
        <li><strong>Meta Storage:</strong> Saves the final timestamp to <code>_mco_premium_expiry</code> in the WordPress user meta table.</li>
    </ol>

    <h3 class="text-xl font-bold mt-6">16.3 Strategic Benefits of "Addon SKUs"</h3>
    <p>This architectural choice enables a high-conversion sales strategy. Instead of asking for a recurring commitment, you can sell a <strong>Single Exam + 1 Month Premium</strong> bundle. This grants the user the certification attempt plus 30 days of unlimited practice and AI feedback, which often feels like a higher-value deal to the customer.</p>

    <div class="bg-cyan-50 border-l-4 border-cyan-500 p-4 my-4">
        <p class="font-bold text-cyan-800">Best Practice: SKU Naming</p>
        <p class="text-cyan-700">Always name your bundle addons using the suffix <code>-1mo-addon</code>. The backend engine is pre-configured to automatically recognize this pattern and grant access without any manual administrative intervention.</p>
    </div>
`;