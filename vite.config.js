import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // Use './' so asset paths work on GitHub Pages (subpath hosting)
    base: './',

    build: {
        // Output to docs/ so GitHub Pages can serve from the /docs folder
        outDir: 'docs',
        emptyOutDir: true,
    },

    server: {
        port: 5173,
    },

    resolve: {
        alias: {
            // 'colyseus.js' ends in .js so Vite treats it as a filename instead of
            // a package name and skips bundling it. Pin it explicitly to the ESM
            // build so Vite always inlines it into the bundle.
            'colyseus.js': path.resolve(__dirname, 'node_modules/colyseus.js/build/esm/index.mjs'),
        },
    },

    optimizeDeps: {
        include: ['colyseus.js'],
    },
});
