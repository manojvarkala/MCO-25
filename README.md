# Annapoorna Advantage: Multi-Tenant Examination Platform

This project is a powerful, multi-tenant React frontend for a WordPress-powered examination system. It is designed to be a flexible and scalable "engine" branded as **Annapoorna Advantage** that can serve customized exam experiences for various brands or subjects using a single, unified codebase.

## Core Architecture

The platform's strength lies in its headless architecture, which separates the application **Annapoorna Advantage** (this React app) from its **content** (managed in WordPress and Google Sheets).

-   **Headless WordPress Backend**: A WordPress site, powered by the custom `mco-exam-integration-engine` plugin, acts as the central hub for:
    -   **User Management & SSO**: Handles all user registration and authentication via JWT.
    -   **E-commerce**: Manages exam and subscription sales through WooCommerce.
    -   **Content Management**: Admins create and manage "Exam Programs" and "Recommended Books" as Custom Post Types.
    -   **API Server**: Provides secure REST API endpoints for all dynamic app operations (e.g., fetching user data, submitting results, getting stats).

-   **Multi-Tenant Configuration**: The React app is made multi-tenant through static JSON configuration files located in the `/public` directory. The `services/apiConfig.ts` service detects the website's hostname and dynamically loads the appropriate configuration, allowing the same application to serve different branding, content, and API endpoints.

-   **Dynamic Question Loading**: Exam questions are loaded on-demand from linked Google Sheets, allowing for easy updates to exam content without requiring an app deployment.

---

## Key Features

### For Users
-   **Secure Single Sign-On (SSO)**: Seamless authentication via the main WordPress site.
-   **Personalized Dashboard**: A central hub to access purchased exams, view statistics, and track progress.
-   **Practice & Certification Exams**: A robust exam player with timers, question navigation, and proctoring features.
-   **AI-Powered Feedback**: Utilizes the Gemini API to generate personalized study guides based on a user's incorrect answers.
-   **Downloadable Certificates**: Generates official PDF certificates upon passing a certification exam.
-   **Social Proof**: A live purchase notification pop-up to create a sense of activity on the site.

### For Administrators
-   **In-App Admin Panel**: A powerful interface within the React app for viewing detailed exam statistics and editing exam program settings in real-time.
-   **AI Content Engine**: Automatically generate and schedule SEO-friendly blog posts from existing exam content.
-   **Debug Sidebar & Masquerade Mode**: A real-time tool for inspecting application state and viewing the app as a regular user or visitor.

---

## Setup & Installation

Setting up a local development environment involves two main parts: the WordPress backend and the React frontend.

### Part 1: WordPress Backend Setup (Manual)

1.  **Install Prerequisites**: Set up a WordPress site with the WooCommerce and WooCommerce Subscriptions plugins installed and activated.
2.  **Install the Engine Plugin**:
    -   Use the in-app generator at **Admin Panel → Integration** to download a ready-to-install `.zip` file.
3.  **Configure JWT Secret**:
    -   Open your `wp-config.php` file.
    -   Add: `define('MCO_JWT_SECRET', 'your-super-long-and-secret-random-string-goes-here');`
4.  **Configure Plugin Settings**:
    -   In WordPress, navigate to the new **Annapoorna Advantage** menu.
    -   In the "Main Settings" tab, enter the URL of your local React app (e.g., `http://localhost:5173`).

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
