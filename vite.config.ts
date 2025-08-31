import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Load env file from the root directory
    // Fix: Replace process.cwd() with __dirname to resolve TypeScript type error.
    const env = loadEnv(mode, __dirname, '');
    
    // Set the API target. Default to Annapoorna, allow override via .env file.
    // Example for .env.local: VITE_API_TARGET_URL=https://www.coding-online.net/wp-json/mco-app/v1
    const apiTarget = env.VITE_API_TARGET_URL || 'https://www.annapoornainfo.com/wp-json/mco-app/v1';

    return {
      base: '/', // Use root path for assets
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      server: {
        proxy: {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});