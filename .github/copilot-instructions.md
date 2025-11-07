## Quick orientation for AI coding agents

This repository is an Electron + React + Vite app organized as a micro-kernel system. The web UI and Electron main/live packaging live under `webapp/`.

Key places to read first

- `webapp/src/kernel/` — the micro-kernel implementation (Loader, Store, DynamicStore, module bootstrap).
- `webapp/src/system/` — business modules (e.g. `Composer`, `Converter`, `Materials`) each exposing an `IModule` object.
- `webapp/electron/main/` — main process entry and integrations (storage hooks, scheduler, ollama, window lifecycle).
- `webapp/package.json` — exact dev/build scripts, dependency versions, and path aliases (`@`, `@kernel`, `@system`).

High-level architecture notes

- The project uses a micro-kernel pattern: kernel modules (in `kernel/`) provide shared platform features (Loader, Store, Graphs). System modules (in `system/`) implement business logic and register themselves as `IModule` objects.
- Module discovery/boot: modules export an object typed as `IModule` (see `webapp/src/kernel/modules/base.ts`). The app bootstraps by creating the Redux store (`DynamicStore`) then loading modules via `ModulesProvider` (Loader). Module dependencies are declared via `depends_on`.
- Inter-module usage follows the `useModule<T>('ModuleName')` hook pattern — code should import modules by name from `@system` or `@kernel` and call `useModule` to get the exported API.

Storage and sessions

- All persistent data lives in a local filesystem layout under `$HOME/klippel/envs/$ENV_NAME/` (workspaces, logs, `.session/` per module). The Electron preload exposes a `window.electron.storage` API for file ops; modules call that, not raw fs from renderer.
- Each module is responsible for serializing its state into `.session/<ModuleName>/...` (see Composer store slices as an example).
- The main process sends a `save-session` IPC message before hiding/closing the window — modules should respond by committing session data.

Developer workflows (how to run & debug)

- Quick dev: cd into `webapp` and run `npm install` then `npm start` (script maps to `electron-vite preview --mode development`).
- Hot dev with HMR: `npm run dev` in `webapp` (uses `electron-vite dev --watch`).
- Build/package: `npm run prebuild` / `npm run package` / `npm run make` are provided in `webapp/package.json` (electron-vite + electron-forge flow).
- If debugging main process, run `npm run dev` and use the DEVTOOLS/Redux Devtools added by `electron-devtools-installer`.

Common project conventions and gotchas

- Path aliases: imports use `@`, `@kernel`, and `@system` (see `webapp/package.json -> paths`). Respect tsconfig/vite path resolution when editing/adding files.
- Don't store non-serializable objects in Redux. The project uses a separate component/registry manager for non-serializable references (see DynamicStore and registry-related code in `kernel/modules/Store`).
- Module registration: new modules must export an `IModule` and be added to the built-in modules map in `webapp/src/kernel/App.tsx` to be booted.
- Session autosave: saving is centralized via storage hooks; prefer storage API calls over direct FS access from renderer code.

Integration points to watch

- Electron preload: `webapp/electron/preload` exposes storage and other secure APIs used throughout the renderer.
- Main process hooks: `webapp/electron/main/index.ts` wires scheduler, storage hooks, and an Ollama client — changes here affect app lifecycle and session persistence.
- Module loader: the Loader creates a dependency graph and initializes modules in order — editing dependency names (`depends_on`) can change initialization order.

Concrete examples (copyable patterns)

- Get a module API in a component:
  - `const converter = useModule<IConverter>("Converter");`
- Define a module skeleton (from README):
  - `const MyModule: IModule = { name: "MyModule", version: "0.0.1", depends_on: ["Loader","Store"] }` and add it into the `builtInModules` map in `App.tsx`.

Module internals and conventions
--------------------------------

When creating or modifying a module under `webapp/src/system/modules/<ModuleName>/`, follow these local conventions to keep code consistent and easy to reason about:

- Folder layout (typical):

  - `components/` — presentational React components (UI only). Keep these pure and small.
  - `hooks/` — React hooks encapsulating component-facing business logic and side effects (useModule calls, local state, computations).
  - `kernelCalls/` — implement module lifecycle events (start, shutdown, restart)
  - `store/` — Redux slices, selectors, actions, and persistence code. This is the single source of truth for module state.
  - `managers/` — longer-lived imperative classes or services (e.g., resource managers, registries).
  - `utils/` or `constants.ts` — small helpers and constants used across the module.
  - `README.md` — optional module docs and example usage.
- Good practices:

  - Split UI vs logic: keep markup and styling in `components/`. Put coordination and async/business logic in `hooks/` or `redux middlewares/` (so components remain easy to test and reuse).
  - Persistence goes to `store/`: Redux slices should contain serialization and session save/load responsibilities. Avoid persisting non-serializable values in Redux; use `hooks` or registry for references.
  - Keep side effects out of render paths — prefer hooks and middleware for effects and async flows.

  - Do NOT pass hooks or hook-returned hooks as props. Call hooks directly inside the component or a custom hook. Passing hooks as props hides React's rules-of-hooks and makes components harder to reason about.
  - Minimize component state and local variables. When possible derive values from props, selectors or module hooks. Prefer a single source of truth (Redux or a module manager) and avoid duplicating state locally.
  - Prefer `useMemo` for derived/computed values instead of creating extra `useState` + `useEffect` plumbing. Use `useMemo` to memoize expensive calculations and to keep components lean; use `useState` only for truly interactive local state.

Examples from this repo:

- `webapp/src/system/modules/Composer/` uses `store/` for slices, `components/` for UI, and `hooks/` for composed logic — follow that pattern when adding features.

TypeScript guidelines
---------------------

This repo is TypeScript-first. Follow these hard rules to keep code consistent and to avoid subtle runtime bugs:

- Enable and respect strict typing. The repo uses `webapp/tsconfig.json`; do not relax `strict` or `noImplicitAny` for new code.
- Forbid the use of the `any` escape hatch. Search for and avoid `any`, `as any`, and unchecked `unknown` casts. If you need a temporary escape, add a TODO comment referencing an issue and prefer a narrow `unknown`+safe-assertion pattern.
- Prefer explicit interfaces/types for module APIs (e.g., `IModule`, store slice shapes, kernel call signatures). Example: `const MyModule: IModule = { name: 'MyModule', ... }`.
- Type React hooks and components precisely: annotate hook return shapes and component props. Use `React.FC<Props>` or explicit function signatures — avoid implicitly-typed props.
- Redux slices must export typed selectors and actions. Keep the serialized shape well-typed and avoid storing non-serializable values in slices (use `managers/` or registries instead).
- Avoid `// @ts-ignore` and only use it with an inline justification and a linked issue number.
- Use `ReturnType<typeof fn>` and generics to avoid repetition when inferring types from helper functions.

Files to inspect for conventions: `webapp/tsconfig.json`, `webapp/src/kernel/modules/base.ts` (module typing), and `webapp/src/kernel/components/DynamicStore` (store & registry patterns).

What not to change without careful checks

- Electron main lifecycle: `webapp/electron/main/index.ts` saves window state and coordinates `save-session` — modifying close/hide behavior changes persistence. Verify session saves still occur.
- Path alias configuration (tsconfig/vite) — broken aliases will cause many import errors.
- Redux serialization assumptions — adding non-serializable fields to slices will break persistence.

If you need more context

- Read `webapp/README.md` and `webapp/src/kernel/*` first. For module-specific behavior, inspect `webapp/src/system/modules/<ModuleName>/README.md` (e.g. `Composer`).
