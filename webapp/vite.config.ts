import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgrPlugin from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // strategies: 'injectManifest',
      // srcDir: 'src',
      // filename: 'sw.ts',
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
        ]
      }
    }),
    viteTsconfigPaths(),
    svgrPlugin(),
  ],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: (id, { getModuleInfo }) => {
          //if (id.includes("@mui")) return "mui";
          if (id.includes("node_modules")) return "vendor";
          if (id.includes("src/kernel")) {

            if (id.includes('App.tsx')) return // required to be in the index.js
            return 'kernel'
          };
          if (id.includes("src/system")) {
            const array = id.split("/");
            const moduleName =
              array[array.findIndex((p) => p === "modules") + 1];

            if (id.includes("Composer")) {
              // custom split for big components
              // if (id.includes('store')) return `system/${moduleName}/store`
              if (id.includes('components')) return `system/${moduleName}/components`
              if (id.includes('hooks')) return `system/${moduleName}/hooks`
            }

            
            return `system/${moduleName}`;
          }
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
    },
  },
});
