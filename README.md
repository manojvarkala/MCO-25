# Multi-Tenant Examination Platform Engine

This project is a powerful, multi-tenant React frontend for a WordPress-powered examination system. It is designed to be a flexible and scalable "engine" that can serve customized exam experiences for various brands or subjects (e.g., medical coding, law, finance) using a single, unified codebase.

## Core Architecture

The platform's strength lies in its headless architecture, which separates the application **engine** (this React app) from its **content** (managed in WordPress and Google Sheets).

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
-   **Practice & Certification Exams**: A robust exam player with timers, question navigation, and proctoring features (fullscreen and focus monitoring).
-   **AI-Powered Feedback**: Utilizes the Gemini API to generate personalized study guides based on a user's incorrect answers.
-   **Downloadable Certificates**: Generates official PDF certificates upon passing a certification exam.
-   **Social Proof**: A live purchase notification pop-up to create a sense of activity on the site.
-   **Profile Management**: Users can update their full name to ensure it is correct for their certificate.

### For Administrators
-   **In-App Admin Panel**: A powerful interface within the React app for:
    -   Viewing detailed exam statistics (sales, attempts, pass rates).
    -   Editing exam program settings in real-time.
    -   Managing WooCommerce products, including complex bundles and subscriptions.
-   **AI Content Engine**: Automatically generate and schedule SEO-friendly blog posts from existing exam content.
-   **Debug Sidebar & Masquerade Mode**: A real-time tool for inspecting application state and viewing the app as a regular user or visitor.
-   **WordPress CPTs**: Easy content management for Exam Programs and Recommended Books within the familiar WordPress environment.

---

## Setup & Installation

Setting up a local development environment involves two main parts: the WordPress backend and the React frontend.

### Prerequisite Plugins

Before installing the engine plugin, ensure the following plugins are installed and activated on your WordPress site:

-   **Required:**
    -   **WooCommerce:** Essential for all e-commerce functionality, including product management and checkout.
-   **Recommended:**
    -   **WooCommerce Subscriptions:** Required if you plan to sell subscription-based access to your exams.
    -   **Affiliates Manager:** A free plugin required for the beta tester affiliate program to function.
    -   **WP Mail SMTP (or similar):** Strongly recommended to ensure reliable email delivery for beta tester invitations and other notifications.

### Part 1: WordPress Backend Setup (Manual)

1.  **Install Prerequisites**: Set up a WordPress site with the WooCommerce and WooCommerce Subscriptions plugins installed and activated.
2.  **Install the Engine Plugin**:
    -   Use the in-app generator at **Admin Panel → Integration** to download a ready-to-install `.zip` file. This is the recommended method.
    -   **Alternatively, for manual installation from source**:
        -   Locate the `mco-exam-integration-engine` directory in this project's source.
        -   Inside `mco-exam-integration-engine/`, rename `mco-exam-integration-engine.txt` to `mco-exam-integration-engine.php`.
        -   Inside the `mco-exam-integration-engine/includes/` directory, rename all `.txt` files to `.php` (e.g., `mco-api.txt` becomes `mco-api.php`).
        -   In the `mco-exam-integration-engine/assets/` folder, rename `mco-styles.txt` to `mco-styles.css`.
        -   Zip the entire `mco-exam-integration-engine` directory.
    -   In your WordPress admin, go to **Plugins → Add New → Upload Plugin** and upload the zip file.
    -   Activate the plugin.
3.  **Configure JWT Secret**:
    -   Open your `wp-config.php` file.
    -   Add a security salt for JWT signing. It must be a unique, long, and random string.
    -   `define('MCO_JWT_SECRET', 'your-super-long-and-secret-random-string-goes-here');`
4.  **Configure Plugin Settings**:
    -   In WordPress, navigate to the new **Exam App Engine** menu.
    -   In the "Main Settings" tab, enter the URL of your local React app (e.g., `http://localhost:5173`). This is required for security (CORS) and generating correct links.
    -   Ensure the "Enable User Registration" checkbox is checked.
5.  **Create Content**:
    -   Go to **Exam App Engine → Exam Programs** to create your exam categories.
    -   Go to **WooCommerce → Products** to create the products associated with your certification exams, ensuring the SKUs match.

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
    
---
## Troubleshooting

### Email Delivery Failures (SMTP Errors)
If beta testers or users report not receiving emails (e.g., welcome emails, password resets), the issue is almost always with your server's email configuration. WordPress's default mail function is often unreliable or blocked.

-   **Error:** `SMTP Error: Could not authenticate.`
-   **Meaning:** This specific error comes from your SMTP plugin (like WP Mail SMTP). It means the credentials it's using (hostname, username, password, API key) are incorrect or have been rejected by your email provider (e.g., Google Workspace, SendGrid).
-   **Solution:**
    1.  Install and activate a dedicated SMTP plugin like **WP Mail SMTP**.
    2.  Carefully follow the plugin's setup guide to connect it to a reliable email service.
    3.  Go into the SMTP plugin's settings and **send a test email**.
    4.  If the test fails, check the plugin's error logs. The logs will provide a detailed reason for the failure, which is almost always incorrect credentials or an issue with your email provider's account setup. This is a server configuration issue, not a bug in the exam engine.