import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import compression from 'vite-plugin-compression'
import brotli from 'vite-plugin-compression'
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    compression({
      threshold: 8192, // Compress files larger than 8KB
      algorithm: 'gzip',
      ext: '.gz',
    }),
    brotli({
      threshold: 8192,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      optipng: { optimizationLevel: 5 }, // Reduce PNG optimization to avoid breaking images
      mozjpeg: { quality: 75 }, // Reduce JPEG size further
      webp: { quality: 85 }, // Convert images to WebP with better compression
      svgo: false, // ⚠️ Disable SVGO (SVG optimization) to avoid errors
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'vue': 'vue/dist/vue.runtime.esm-browser.prod.js', // ✅ Optimize Vue imports
      'vue-router': 'vue-router/dist/vue-router.esm-browser.prod.js',
    },
  },
  server: {
    historyApiFallback: true,
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build_static',
    sourcemap: false,
    minify: 'terser', // ✅ More aggressive JS minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs
        drop_debugger: true, // Remove debugger statements
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.split('node_modules/')[1].split('/')[0]
          }
        },
      },
    },
  },
})
