# Medical Coding Online Examination App

This project is a React-based frontend for the Medical Coding Online examination platform.

## Overview

This application serves as the user interface for taking practice and certification exams. All user data, exam configurations, and test results are managed through a custom WordPress plugin, which acts as the single source of truth and provides a secure backend via its REST API.

### Key Features:
-   **Single Sign-On (SSO):** Authenticates users via a WordPress site.
-   **Dynamic Exam Loading:** Fetches all exam content and configuration from the WordPress backend.
-   **Secure Results Sync:** Saves test results both locally for a responsive UI and syncs them back to the user's WordPress profile.
-   **AI-Powered Feedback:** Uses the Gemini API to provide personalized study guides for failed exams.

## Running Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Run the Vite development server:
    `npm run dev`

**Note:** The application requires a connection to a live WordPress site running the corresponding `mco-exam-integration` plugin to function correctly. The plugin code is provided within the `src/components/Integration.tsx` component.