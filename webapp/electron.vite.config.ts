import { defineConfig, externalizeDepsPlugin, swcPlugin } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), swcPlugin()],
    build: {
      outDir: "dist/electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/electron/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    root: ".",
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@kernel": resolve(__dirname, "./src/kernel"),
        "@system": resolve(__dirname, "./src/system"),
      },
    },
    build: {
      outDir: "dist/electron/renderer",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },

        onwarn(warning, warn) {
          // Suppress "Module level directives cause errors when bundled" warnings
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks: (id, { getModuleInfo }) => {
            if (id.includes("node_modules")) return "vendor";
            if (id.includes("src/kernel")) {
              return // kernel must be in the index to ensure first loading
            }
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
  },
});
