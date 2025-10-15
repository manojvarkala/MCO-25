export const ch10_in_app_admin_analytics = `
    <h2 class="text-3xl font-bold font-display text-slate-800" id="ch10">Chapter 10: Sales Analytics Dashboard</h2>

    <h3 class="text-xl font-bold mt-6">10.1 Accessing Analytics</h3>
    <p>The Sales Analytics dashboard is a powerful tool for monitoring the performance and profitability of your certification exams. You can access it from the in-app admin panel by navigating to <strong>Admin → Sales Analytics</strong>.</p>
    <p>The dashboard provides a comprehensive table view of key metrics for every certification exam product in your system. This data is compiled from both WooCommerce sales data and user exam results stored in WordPress.</p>

    <h3 class="text-xl font-bold mt-6">10.2 Understanding the Metrics</h3>
    <p>The analytics table provides the following columns for each certification exam:</p>
    <dl>
        <dt class="font-bold mt-4">Exam Program</dt>
        <dd>The name of the certification exam.</dd>

        <dt class="font-bold mt-4">Sales</dt>
        <dd>The total number of units sold for this specific exam product, fetched directly from WooCommerce's sales count metadata. This reflects the total number of purchases.</dd>

        <dt class="font-bold mt-4">Revenue</dt>
        <dd>An <strong>estimated</strong> total revenue for the exam. This is calculated by multiplying the <strong>Total Sales</strong> by the product's <strong>current price</strong>. Note: This is an estimate and does not account for historical price changes, coupons, or refunds.</dd>

        <dt class="font-bold mt-4">Attempts</dt>
        <dd>The total number of times this specific exam has been completed by all users across the platform.</dd>

        <dt class="font-bold mt-4">Avg. Score</dt>
        <dd>The average score achieved by all users who have attempted this exam.</dd>

        <dt class="font-bold mt-4">Pass Rate</dt>
        <dd>The percentage of total attempts that resulted in a passing score. This is a key indicator of exam difficulty and user preparedness. The pass rate is also visualized with a color-coded progress bar for quick assessment (Green > 70%, Yellow > 50%, Red <= 50%).</dd>
    </dl>
    
    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
        <p class="font-bold text-blue-800">Data Source & Refreshing</p>
        <p class="text-blue-700">The data for this dashboard is calculated on-demand by the WordPress API. It queries all user meta to aggregate results and queries WooCommerce for sales data. As such, it is always up-to-date and reflects the most current information available on your server.</p>
    </div>
`;