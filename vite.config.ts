import path from 'path';
import { defineConfig, loadEnv, UserConfig } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Load env file from the root directory
    const env = loadEnv(mode, __dirname, '');
    
    const config: UserConfig = {
      base: '/', 
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        '__DEV__': mode === 'development'
      },
      plugins: [], 
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@components': path.resolve(__dirname, './src/components'),
          '@services': path.resolve(__dirname, './src/services'),
          '@context': path.resolve(__dirname, './src/context'),
          '@assets': path.resolve(__dirname, './src/assets'),
        },
      },
      server: {
        proxy: {
            // FIX: Robust proxying for WordPress REST API
            '/wp-json': {
                target: env.VITE_API_TARGET_URL || 'http://localhost:80', 
                changeOrigin: true,
                secure: false,
                cookieDomainRewrite: "localhost",
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                      console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                      // console.log('Sending Request to the Target:', req.method, req.url);
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                      // console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                    });
                },
            },
        },
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
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