
// This file stores base64 encoded versions of tenant logos for reliable embedding
// in contexts like PDF generation (e.g., in Certificate.tsx) where external URLs
// can cause CORS or loading issues with html2canvas.
//
// Replace these placeholder base64 strings with the actual base64 data for your logos.
// You can convert your logo image (PNG, JPG, SVG) to base64 using online tools.

export const localLogos: { [orgId: string]: string } = {
    // Annapoorna Infotech Logo - Placeholder (1x1 transparent PNG)
    'annapoornainfo': `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`, 
    // Medical Coding Online Logo - Placeholder (1x1 transparent PNG)
    'org-medical-coding-online': `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`, 
    'bharatcerts': `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMwNDc4NTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9ImludGVyIiBmb250LXNpemU9IjMwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPjQyPC90ZXh0Pjwvc3ZnPg==`,
};
