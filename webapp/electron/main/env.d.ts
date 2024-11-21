/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_ROOT_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
