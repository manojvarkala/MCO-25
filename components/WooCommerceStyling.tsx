import * as React from 'react';
import { Archive } from 'lucide-react';

export default function WooCommerceStyling() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-yellow-50 p-8 rounded-xl shadow-lg border border-yellow-200 text-center">
                <Archive className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                <h1 className="text-3xl font-extrabold text-yellow-900">Component Obsolete</h1>
                <p className="mt-4 text-yellow-800">
                    The functionality of this component has been merged into the main <strong>WordPress Integration Plugin</strong> for better stability and to resolve conflicts.
                </p>
                <p className="mt-2 text-yellow-700">
                    You can safely deactivate and delete the separate "MCO Custom Cart & Checkout Styling" plugin from your WordPress site. The updated, unified plugin code is available in the "Integration Guide" component, accessible from the main Admin Panel.
                </p>
            </div>
        </div>
    );
}