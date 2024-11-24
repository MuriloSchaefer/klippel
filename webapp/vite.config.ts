import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgrPlugin from "vite-plugin-svgr";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteTsconfigPaths(),
    svgrPlugin(),
  ],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: (id, { getModuleInfo }) => {
          //if (id.includes("@react")) return "react";
          //if (id.includes("@mui") || id.includes("react")) return "mui+react";
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
  resolve: {
    alias: {
      "@": resolve(__dirname, "./*"),
      "@kernel": resolve(__dirname, "./kernel"),
      "@system": resolve(__dirname, "./system")
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
    },
  },
});
