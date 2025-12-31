import path from 'path';
import { defineConfig, loadEnv, UserConfig } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Load env file from the root directory
    const env = loadEnv(mode, __dirname, '');
    
    const config: UserConfig = {
      base: '/', // Use root path for assets
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // FIX: Define a global constant to check for development mode to resolve type errors.
        '__DEV__': mode ===