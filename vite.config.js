import { defineConfig } from 'vite';

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

    // 'colyseus.js' has a package name ending in .js which tricks Vite into
    // treating it as a file path rather than an npm package. Explicitly
    // include it in pre-bundling so it gets inlined into the output bundle.
    optimizeDeps: {
        include: ['colyseus.js'],
    },
});
