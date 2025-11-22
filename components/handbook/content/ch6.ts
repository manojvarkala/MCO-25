export const ch6Content = `
    <h3 class="text-xl font-bold">6.1 Linking Products via SKU</h3>
    <p>The Stock Keeping Unit (SKU) is the universal identifier that connects the entire ecosystem. Every purchasable item, whether it's a single exam, a bundle, or a subscription, must have a unique SKU in WooCommerce. This SKU is what the React app uses to determine a user's entitlements.</p>
    <ul>
        <li>An "Exam Program" in WordPress is linked to a "Certification Exam" product via its SKU.</li>
        <li>When a user buys that product, its SKU is added to their <code>paidExamIds</code> list in the JWT.</li>
        <li>The React app checks if an exam's SKU is in the user's <code>paidExamIds</code> list to unlock the "Start Exam" button.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">6.2 Handling Simple Products (Certification Exams)</h3>
    <p>This is the most straightforward integration. A standard "Simple" product in WooCommerce is created for each certification exam. The product's SKU must exactly match the "Certification Exam SKU" field in the corresponding "Exam Program" post in WordPress.</p>
    <p>The app fetches the price, sale price, and name directly from this WooCommerce product data via the API.</p>
    
    <h3 class="text-xl font-bold mt-6">6.3 Handling Subscriptions</h3>
    <p>The platform is fully integrated with the official "WooCommerce Subscriptions" extension. Subscription products are created in WooCommerce with their own unique SKUs (e.g., <code>sub-monthly</code>, <code>sub-yearly</code>).</p>
    <p>When a user has an active subscription, their JWT payload receives a special boolean flag: <code>isSubscribed: true</code>. The React app uses this single flag to grant universal access to all practice exams and AI feedback features, regardless of individual exam purchases.</p>

    <h3 class="text-xl font-bold mt-6">6.4 Handling Bundle Products</h3>
    <p>Bundles are a powerful way to upsell. They are created as "Simple" products in WooCommerce but contain special metadata that our plugin recognizes. The platform supports two main types of bundles, identified by their SKU naming convention:</p>
    <ul>
        <li><strong>Practice Bundle (e.g., <code>exam-cpc-cert-1</code>):</strong> This typically bundles a certification exam with 1 month of access to its associated practice materials. This is handled via custom logic in the app.</li>
        <li><strong>Subscription Add-on Bundle (e.g., <code>exam-cpc-cert-1mo-addon</code>):</strong> This bundles a certification exam with a 1-month subscription, granting system-wide benefits. This is the preferred and most powerful bundle type.</li>
    </ul>
    <p>The React app's "Product Customizer" provides a user-friendly interface for creating these complex bundle products in WooCommerce without needing to manually edit metadata.</p>
`;
