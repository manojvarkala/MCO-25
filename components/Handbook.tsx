import React, { FC } from 'react';

const Handbook: FC = () => {
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-[rgb(var(--color-text-strong-rgb))] font-display">
                Admin Handbook
            </h1>
            <p className="text-[rgb(var(--color-text-muted-rgb))]">
                Welcome to the administrator's guide for the Exam Application Engine. This handbook provides a detailed overview of all administrative features, best practices, and troubleshooting steps.
            </p>

            <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold mb-4">Core Concepts</h2>
                <div className="prose max-w-none">
                    <p>
                        The application is built around a few core concepts: <strong>Exam Programs</strong>, <strong>WooCommerce Products</strong>, and <strong>User Entitlements</strong>.
                    </p>
                    <ul>
                        <li><strong>Exam Programs:</strong> These are the main content containers. Each program is a custom post type in WordPress and links together a free practice exam, a paid certification exam, and a WooCommerce product. You manage these in the "Exam Programs" tab.</li>
                        <li><strong>WooCommerce Products:</strong> These handle the sales. A "Simple Product" in WooCommerce corresponds to a certification exam. When a user purchases this product, the system grants them an entitlement to take the linked exam.</li>
                        <li><strong>User Entitlements:</strong> Entitlements are stored as user meta on the WordPress side. The JWT token passed to this application contains a list of SKUs the user has purchased, which unlocks the corresponding exams.</li>
                    </ul>
                </div>
            </div>

             <div className="bg-[rgb(var(--color-card-rgb))] p-6 rounded-xl shadow-lg border border-[rgb(var(--color-border-rgb))]">
                <h2 className="text-2xl font-bold mb-4">Common Workflows</h2>
                <div className="prose max-w-none">
                    <h4>Adding a New Exam</h4>
                    <ol>
                        <li>Go to the <strong>"Exam Programs"</strong> tab and click "Create New Program".</li>
                        <li>Give the program a name (e.g., "Advanced Cardiology Certification").</li>
                        <li>Choose to automatically create a new WooCommerce product. The system will pre-fill the name and SKU for you.</li>
                        <li>Save the new program. The page will refresh.</li>
                        <li>Find your new program, click "Edit", and fill in all the details: description, question source URL, number of questions, etc.</li>
                        <li>Don't forget to link any recommended study books!</li>
                    </ol>

                    <h4>Updating Prices</h4>
                    <ol>
                        <li>Go to the <strong>"Product Customizer"</strong> tab.</li>
                        <li>Find the product you want to update. You can use the tabs to filter by type (Simple, Bundle, etc.).</li>
                        <li>Click the "Edit" icon on the product card.</li>
                        <li>Change the "Sale Price" and "Regular Price" as needed and save. The changes are synced live to WooCommerce.</li>
                        <li>For bulk price updates, use the checkboxes to select multiple products and use the bulk edit panel that appears at the top.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default Handbook;
