
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
        '__DEV__': mode === 'development' // Completed the line here
      },
      plugins: [], // Added an empty plugins array
      resolve: {
        alias: {
          // You might not need all of these, but they are common aliases
          '@': path.resolve(__dirname, './src'),
          '@components': path.resolve(__dirname, './src/components'),
          '@services': path.resolve(__dirname, './src/services'),
          '@context': path.resolve(__dirname, './src/context'),
          '@assets': path.resolve(__dirname, './src/assets'),
        },
      },
      server: {
        proxy: {
            // Proxy API requests to your WordPress backend in development
            '/wp-json': {
                target: env.VITE_API_TARGET_URL || 'http://localhost:80', // Fallback for VITE_API_TARGET_URL
                changeOrigin: true,
                rewrite: (path) => path, // Do not rewrite the path
                secure: false, // Set to true for HTTPS backends
            },
        },
      },
      build: {
        outDir: 'dist', // Output directory
        emptyOutDir: true, // Clean the output directory before building
        rollupOptions: {
            output: {
                // Ensure consistent naming for static assets
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                        return 'assets/css/[name].[hash].css';
                    }
                    if (assetInfo.name && /\.(png|jpe?g|gif|svg|ico)$/.test(assetInfo.name)) {
                        return 'assets/img/[name].[hash][extname]';
                    }
                    if (assetInfo.name && /\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
                        return 'assets/fonts/[name].[hash][extname]';
                    }
                    return 'assets/[name].[hash][extname]';
                },
                chunkFileNames: 'assets/js/[name].[hash].js',
                entryFileNames: 'assets/js/[name].[hash].js',
            },
        },
      },
    };
    return config;
});