export const ch12_in_app_admin_products = `
    <h2 class="text-3xl font-bold font-display" id="ch12">Chapter 12: Product Customizer</h2>
    
    <h3 class="text-xl font-bold mt-6">12.1 Managing WooCommerce Products from the App</h3>
    <p>The Product Customizer, located at <strong>Admin → Product Customizer</strong>, is a powerful feature that allows you to create, edit, and manage your WooCommerce products directly from the app interface. This is often faster and more convenient than using the standard WooCommerce product editor in the WordPress admin, especially for managing subscriptions and bundles.</p>
    <p>The customizer is organized into tabs to separate different product types:</p>
    <ul>
        <li><strong>Simple Products:</strong> These are your standard, one-time purchase products, primarily used for individual Certification Exams.</li>
        <li><strong>Subscriptions:</strong> These are recurring payment products, used for your Monthly and Yearly plans. This requires the "WooCommerce Subscriptions" extension to be active on your site.</li>
        <li><strong>Bundles:</strong> These are special "Simple" products that package other products together, such as a certification exam plus a subscription.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">12.2 Creating & Editing Simple Products</h3>
    <p>In the "Simple Products" tab, click "Create New" or the "Edit" icon on an existing product. You can configure:</p>
    <ul>
        <li><strong>Product Name:</strong> The customer-facing name of the exam.</li>
        <li><strong>SKU:</strong> The unique identifier. This is a critical field that must match the SKU in the corresponding "Exam Program". You cannot edit the SKU of an existing product.</li>
        <li><strong>Sale Price:</strong> The price the customer will pay.</li>
        <li><strong>Regular Price:</strong> The "original" price, which will be shown with a strikethrough if it's higher than the sale price.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">12.3 Creating & Editing Subscription Products</h3>
    <p>In the "Subscriptions" tab, you can manage your recurring plans. The editor includes all the fields of a simple product, plus:</p>
    <ul>
        <li><strong>Billing Period:</strong> The frequency of the charge (Day, Week, Month, Year).</li>
        <li><strong>Billing Interval:</strong> How often the charge occurs (e.g., every <strong>1</strong> Month, or every <strong>3</strong> Months).</li>
        <li><strong>Length:</strong> How long the subscription lasts before expiring (e.g., 12 months). Set to <strong>0</strong> for a subscription that continues until cancelled.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">12.4 Creating & Editing Bundle Products</h3>
    <p>The "Bundles" tab provides a powerful interface for creating your most valuable offers.</p>
    <ol>
        <li>Click "Create New Bundle" or edit an existing one.</li>
        <li>Set the bundle's Name, SKU, and Price.</li>
        <li><strong>Included Exams:</strong> Use the checklist to select one or more "Simple" products (your certification exams) to include in the bundle.</li>
        <li><strong>Included Subscription:</strong> Use the dropdown to optionally add one of your "Subscription" products to the bundle (e.g., adding a "Monthly Subscription" to create an "Exam + Subscription" offer).</li>
        <li>The modal will show you the total regular price of all included items, helping you set an attractive bundle price.</li>
    </ol>
`;