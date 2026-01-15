export const ch17_visual_design = `
    <h2 class="text-3xl font-bold font-display" id="ch17">Chapter 17: Visual Identity & Unified Grid Systems</h2>
    
    <h3 class="text-xl font-bold mt-6">17.1 The "Exclusive Value Bundles" Section</h3>
    <p>To maximize the visibility of package deals, a dedicated <strong>Special Bundles</strong> section has been added to the top of the dashboard and program pages. This section is automatically populated with any product in your inventory that is marked as a "Bundle" and contains two or more items.</p>
    
    <h3 class="text-xl font-bold mt-6">17.2 Unified Grid Framework</h3>
    <p>Visual consistency between the React frontend and the WordPress dashboard is maintained through a unified CSS grid system. This ensures that cards always align perfectly and adapt responsively to any screen size.</p>
    <ul class="list-disc pl-5 space-y-2 mt-4">
        <li><code>mco-grid-container</code>: The standard 3-column layout used for exam programs.</li>
        <li><code>mco-bundle-grid</code>: A high-impact grid designed specifically for featured bundles.</li>
        <li><code>mco-subscription-grid</code>: A centered, large-card grid for membership plans.</li>
    </ul>

    <h3 class="text-xl font-bold mt-6">17.3 Automated Gradient Mapping</h3>
    <p>The engine now uses a <strong>Semantic Gradient System</strong>. Components automatically select their background based on the underlying data type:</p>
    <table class="min-w-full divide-y divide-slate-200 mt-4 border border-slate-200">
        <thead class="bg-slate-50">
            <tr>
                <th class="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Product Type</th>
                <th class="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Gradient ID</th>
                <th class="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Primary Color</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-sm">
            <tr>
                <td class="px-4 py-2 font-medium">Practice Exam</td>
                <td class="px-4 py-2"><code>mco-gradient--practice-1</code></td>
                <td class="px-4 py-2 text-blue-600 font-bold">Blue</td>
            </tr>
            <tr>
                <td class="px-4 py-2 font-medium">Certification Exam</td>
                <td class="px-4 py-2"><code>mco-gradient--cert-1</code></td>
                <td class="px-4 py-2 text-emerald-600 font-bold">Green</td>
            </tr>
            <tr>
                <td class="px-4 py-2 font-medium">Subscription Addon</td>
                <td class="px-4 py-2"><code>mco-gradient--bundle-sub</code></td>
                <td class="px-4 py-2 text-teal-600 font-bold">Teal</td>
            </tr>
            <tr>
                <td class="px-4 py-2 font-medium">Yearly Membership</td>
                <td class="px-4 py-2"><code>mco-gradient--sub-yearly</code></td>
                <td class="px-4 py-2 text-violet-600 font-bold">Violet</td>
            </tr>
        </tbody>
    </table>

    <h3 class="text-xl font-bold mt-6">17.4 Dashboard Personalization</h3>
    <p>For premium members, the dashboard header transforms with a specific <strong>Cyan-to-Slate</strong> gradient border and a "PRO" badge. This serves as immediate visual confirmation of their active status and increases the perceived value of their subscription.</p>
`;