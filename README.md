# Multi-Tenant Examination Platform Engine

This project is a powerful, multi-tenant React frontend for a WordPress-powered examination system. It is designed to be a flexible and scalable "engine" that can serve customized exam experiences for various brands or subjects (e.g., medical coding, law, finance) using a single, unified codebase.

## Core Architecture

The platform's strength lies in its headless architecture, which separates the application **engine** (this React app) from its **content** (managed in WordPress and Google Sheets).

-   **Headless WordPress Backend**: A WordPress site, powered by the custom `mco-exam-integration-engine` plugin, acts as the central hub for:
    -   **User Management & SSO**: Handles all user registration and authentication via JWT.
    -   **E-commerce**: Manages exam and subscription sales through WooCommerce.
    -   **Content Management**: Admins create and manage "Exam Programs" and "Recommended Books" as Custom Post Types.
    -   **API Server**: Provides secure `admin-ajax.php` endpoints for all dynamic app operations (e.g., fetching user data, submitting results, getting stats).

-   **Multi-Tenant Configuration**: The React app is made multi-tenant through static JSON configuration files located in the `/public` directory. The `services/apiConfig.ts` service detects the website's hostname and dynamically loads the appropriate configuration, allowing the same application to serve different branding, content, and API endpoints.

-   **Dynamic Question Loading**: Exam questions are loaded on-demand from linked Google Sheets, allowing for easy updates to exam content without requiring an app deployment.

---

## Key Features

### For Users
-   **Secure Single Sign-On (SSO)**: Seamless authentication via the main WordPress site.
-   **Personalized Dashboard**: A central hub to access purchased exams, view statistics, and track progress.
-   **Practice & Certification Exams**: A robust exam player with timers, question navigation, and proctoring features (fullscreen and focus monitoring).
-   **AI-Powered Feedback**: Utilizes the Gemini API to generate personalized study guides based on a user's incorrect answers.
-   **Downloadable Certificates**: Generates official PDF certificates upon passing a certification exam.
-   **Gamification (Spin & Win)**: An engaging wheel-of-fortune feature to win prizes like free exams or subscriptions.
-   **Social Proof**: A live purchase notification pop-up to create a sense of activity on the site.
-   **Profile Management**: Users can update their full name to ensure it is correct for their certificate.

### For Administrators
-   **In-App Admin Panel**: A powerful interface within the React app for:
    -   Viewing detailed exam statistics (sales, attempts, pass rates).
    -   Managing user prizes and "Spin & Win" attempts.
    -   Temporarily customizing exam settings (e.g., number of questions, duration) for the current session.
-   **WordPress CPTs**: Easy content management for Exam Programs and Recommended Books within the familiar WordPress environment.
-   **Debug Sidebar**: A real-time tool for inspecting user data, purchases, and API connectivity.

---

## Technology Stack

-   **Frontend**: React, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **Routing**: React Router DOM v6
-   **AI Integration**: `@google/genai` (Gemini API)
-   **PDF Generation**: `jspdf`, `html2canvas`

---

## Setup & Installation

Setting up a local development environment involves two main parts: the WordPress backend and the React frontend.

### Part 1: WordPress Backend Setup

1.  **Install Prerequisites**: Set up a WordPress site with the WooCommerce plugin installed and activated.
2.  **Install the Engine Plugin**:
    -   Locate the `mco-exam-integration-engine` directory in this project's source.
    -   **Crucially, rename all `.txt` files to their correct extensions**:
        -   `mco-exam-integration-engine.txt` &rarr; `mco-exam-integration-engine.php`
        -   All files in `/includes/` &rarr; `.php`
        -   `/assets/mco-styles.txt` &rarr; `mco-styles.css`
    -   Zip the entire `mco-exam-integration-engine` directory.
    -   In your WordPress admin, go to **Plugins &rarr; Add New &rarr; Upload Plugin** and upload the zip file.
    -   Activate the plugin.
3.  **Configure JWT Secret**:
    -   Open your `wp-config.php` file.
    -   Add a security salt for JWT signing. It must be a unique, long, and random string (at least 32 characters).
    -   `define('MCO_JWT_SECRET', 'your-super-long-and-secret-random-string-goes-here');`
4.  **Configure Plugin Settings**:
    -   In WordPress, navigate to the new **Exam App Engine** menu.
    -   In the "Main Settings" tab, enter the URL of your local React app (e.g., `http://localhost:5173`). This is required for security (CORS) and generating correct links.
5.  **Create Content**:
    -   Go to **Exam App Engine &rarr; Exam Programs** to create your exam categories.
    -   Go to **Exam App Engine &rarr; Recommended Books** to add study materials.
    -   Go to **WooCommerce &rarr; Products** to create the products associated with your certification exams.

### Part 2: React Frontend Setup

1.  **Clone the Repository**:
    `git clone <repository-url>`
2.  **Install Dependencies**:
    `npm install`
3.  **Environment Variables**:
    -   Create a `.env` file in the root of the project.
    -   Add the following variables:
        ```
        # The URL of your local or staging WordPress backend
        VITE_API_TARGET_URL=http://your-local-wordpress.site

        # Your API key for Google Gemini
        GEMINI_API_KEY=your-gemini-api-key-goes-here
        ```
4.  **Run the Development Server**:
    `npm run dev`

The application should now be running locally, proxying all API requests to your WordPress backend.

---

## Deployment

1.  **Build the Application**:
    `npm run build`
2.  **Deploy**:
    The command will create a `dist` directory containing the optimized, static production build. Deploy the contents of this directory to any static hosting provider (e.g., Vercel, Netlify, AWS S3).