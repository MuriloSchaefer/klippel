import { defineConfig, externalizeDepsPlugin, swcPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), swcPlugin()],
    build: {
      outDir:'dist/electron/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir:'dist/electron/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@kernel": resolve(__dirname, "./src/kernel"),
        "@system": resolve(__dirname, "./src/system")
      }
    },
    build: {
      outDir:'dist/electron/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: (id, { getModuleInfo }) => {
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
      }
    }
  }
})