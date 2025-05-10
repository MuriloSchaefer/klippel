/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENV_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
