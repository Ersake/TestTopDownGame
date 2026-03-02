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
});
