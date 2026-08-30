/**
 * `.sql?raw` imports.
 *
 * `vite/client` declares `*?raw` for the renderer, but the main-process
 * tsconfig does not pull those ambient types in, and the schema is imported
 * from main. Declared here, beside the SQL it describes.
 */
declare module "*.sql?raw" {
  const contents: string;
  export default contents;
}
