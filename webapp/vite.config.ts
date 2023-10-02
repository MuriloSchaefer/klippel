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
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
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
          if (id.includes("@mui")) return "material";
          if (id.includes("node_modules")) return "vendor";
          if (id.includes("src/kernel")) return "kernel";
          if (id.includes("src/system")) {
            const array = id.split("/");
            const moduleName =
              array[array.findIndex((p) => p === "modules") + 1];
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
