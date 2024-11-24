/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_TEST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
