# Webapp
Electron + React + Vite to build a descentrilized application capable of composing garment cloths. The system laverage the local computing power to perform its operations the storage is locally in the disks spread on files within the filesystem, something similar to what the linux kernel does.

## Install the latest release

Pre-built installers for every release are published on the project's GitHub
Releases page:

**https://github.com/MuriloSchaefer/klippel/releases/latest**

Pick the asset that matches your OS, download it, and follow the steps below.

### Windows

1. Download `Klippel-<version> Setup.exe` (the Squirrel installer) from the
   release page.
2. Double-click the downloaded file. Windows SmartScreen may show a
   "Windows protected your PC" dialog because the build is not
   code-signed — click **More info** → **Run anyway**.
3. The installer runs silently and launches Klippel automatically when
   it finishes. A shortcut is added to the Start Menu under `Klippel`.
4. To update later, just run the installer for the newer release; it
   replaces the previous version in place.

### macOS

1. Download the `Klippel-darwin-<arch>-<version>.zip` asset that matches
   your CPU (`arm64` for Apple Silicon, `x64` for Intel Macs).
2. Double-click the `.zip` in Finder to extract `Klippel.app`.
3. Drag `Klippel.app` into your `/Applications` folder.
4. The first time you launch, macOS Gatekeeper will refuse to open the
   app because it is not notarized. Open **System Settings → Privacy &
   Security**, scroll to the message about Klippel being blocked, and
   click **Open Anyway**. Confirm in the follow-up dialog.
5. Subsequent launches work normally from Launchpad or Spotlight.

### Linux — Debian / Ubuntu (`.deb`)

1. Download the `klippel_<version>_amd64.deb` asset.
2. Install it with apt (recommended, resolves system deps automatically):

   ```bash
   $ sudo apt install ./klippel_<version>_amd64.deb
   ```

   Or with dpkg directly:

   ```bash
   $ sudo dpkg -i klippel_<version>_amd64.deb
   $ sudo apt -f install   # only if dpkg reports missing deps
   ```
3. Launch from your application menu, or run `klippel` from a terminal.

### Linux — Arch / Manjaro / EndeavourOS

There is no native `pacman` package yet. Two options:

**Option A — convert the `.deb` with `debtap` (recommended):**

1. Install `debtap` from the AUR (one-time setup):

   ```bash
   $ yay -S debtap          # or: paru -S debtap
   $ sudo debtap -u         # update the conversion DB
   ```
2. Download the `klippel_<version>_amd64.deb` asset.
3. Convert and install:

   ```bash
   $ debtap klippel_<version>_amd64.deb
   $ sudo pacman -U klippel-<version>-1-x86_64.pkg.tar.zst
   ```

**Option B — extract the `.deb` manually (no AUR helper needed):**

```bash
$ mkdir klippel && cd klippel
$ ar x ../klippel_<version>_amd64.deb
$ sudo tar -xf data.tar.xz -C /
```

The binary lands at `/opt/Klippel/klippel` and a `.desktop` entry is
installed under `/usr/share/applications/`. Launch from your app menu
or run `klippel` from a terminal.

### Linux — Fedora / RHEL / openSUSE (`.rpm`)

1. Download the `klippel-<version>.x86_64.rpm` asset.
2. Install it:

   ```bash
   $ sudo dnf install ./klippel-<version>.x86_64.rpm
   # or, on older systems:
   $ sudo rpm -i klippel-<version>.x86_64.rpm
   ```
3. Launch from your application menu, or run `klippel` from a terminal.

### Verifying the install

After launch, the title bar should read **Klippel** and the version
shown in **Help → About** (or the bottom-right corner of the status bar)
should match the release you downloaded.

## Running the app
```bash
$ npm i
$ npm start
```

## Running the E2E tests

The end-to-end suite boots a real Electron instance, connects puppeteer to it over CDP (`localhost:9222`), and drives the UI through the same MCP tools the AI uses. Tests live under `src/**/mcpTools/tests/*.e2e.test.ts`.

### 1. Prerequisites

- Dependencies installed (`npm i`).
- No other Klippel/Chromium instance is already listening on port `9222` (the harness reuses an existing CDP if it finds one — usually you want a fresh boot).
- If you are running from the **VS Code integrated terminal**, make sure `ELECTRON_RUN_AS_NODE` is **not** set in your shell. VS Code exports it for its extension host and, if it leaks into the test process, the Electron binary will run as plain Node and crash on startup with `Cannot read properties of undefined (reading 'isPackaged')`. The `npm run test:e2e` script unsets it automatically; only worry about this when invoking `jest` directly.

### 2. Pick an environment and a base workspace

Two env vars control where the tests read/write data:

- `ENV_NAME` — the env folder under `$HOME/klippel/envs/`. Use `benchmark` for tests so you don't pollute your real `small-app` / `personal` envs.
- `BASE_WORKSPACE` — the workspace template that gets copied into a fresh test workspace before each suite. `empty` is a clean slate.

Both default to `benchmark` / `empty` when using the npm script.

### 3. Run the suite

Run every e2e test:

```bash
$ npm run test:e2e
```

Run a single file or pattern (everything after `--` is forwarded to jest):

```bash
$ npm run test:e2e -- src/system/modules/Composer/mcpTools/tests/deleteElective.e2e.test.ts
$ npm run test:e2e -- -t "deletes an elective"
```

Override the env / workspace per-run:

```bash
$ ENV_NAME=my-scratch BASE_WORKSPACE=small-app npm run test:e2e -- <pattern>
```

Run headless (no visible window — needed for CI or remote shells without a display server). Requires `xvfb-run` on `PATH`:

```bash
$ npm run test:e2e:headless
$ npm run test:e2e:headless -- src/system/modules/Composer/mcpTools/tests/deleteElective.e2e.test.ts
```

### 4. What happens under the hood

1. `jest.globalSetup.ts` probes `http://localhost:9222`. If nothing answers, it spawns `npm run dev` and waits up to 90 s for CDP to come up. With `KLIPPEL_DEV_LOG=1` (set by the script), the dev server output is streamed to the terminal so you can watch the boot.
2. Each test connects puppeteer to that CDP endpoint, calls `resetWorkspace(page, '<suite-id>')` to switch to a fresh workspace cloned from `BASE_WORKSPACE`, and drives the UI through the MCP tools.
3. `afterAll` disconnects puppeteer and removes the test workspace.

### 5. Troubleshooting

- **`Klippel did not expose CDP on :9222 within 90000ms`** — the dev server failed to boot. Re-run with `KLIPPEL_DEV_LOG=1` (already set by the npm script) and scroll up for the real error. The most common culprit is `ELECTRON_RUN_AS_NODE=1` leaking from VS Code (see prerequisites).
- **`No renderer page found in Electron`** — the renderer hasn't finished loading yet. Usually transient; re-run.
- **Port 9222 already in use** — a previous test run left an Electron instance behind. Either `pkill -f 'electron.*9222'` or let the harness reuse it (it will, if `/json/list` returns a real page target).
- **Jest hangs at "did not exit one second after the test run has completed"** — harmless. It's the dev process still holding handles; the suite already passed.

### 6. Running tests against a packaged build

To drive the **installed** binary instead of `npm run dev`:

```bash
$ KLIPPEL_BIN_PATH=/path/to/installed/Klippel npm run test:e2e -- <pattern>
```

On headless Linux CI, combine the two by setting `KLIPPEL_USE_XVFB=1` alongside `KLIPPEL_BIN_PATH` 

## Architecture

The project is structured as a micro-kernel system, its kernel consists in every logic that is not business modules, such as: [Booting the system](/webapp/src/kernel/modules/Loader/), [Graph management](/webapp/src/kernel/modules/Graphs), etc.

In the system folder we have each system module, such as: [Composer](/webapp/src/system/modules/Composer) that orchestrate all the garment creation, [unit converter](/webapp/src/system/modules/Converter) to convert such amount of one unit to another.

Each module exports by an object of type [IModule](webapp/src/kernel/modules/base.ts) with things it exports to other modules, any other component that wants to consume that interface, need to use the [useModule](webapp/src/kernel/hooks/useModule.ts) hook that is implemented in `kernel/hooks` folder.

```js
function MyComponent(){
    loadedModule = useModule<IConverter>('Converter')
    return <></>
}
```

The name in the parameter is the desired module. Next section will talk about booting settings

## Boot

Upon launching, the application initializes the Electron environment and sets up essential modules, including storage and scheduling. When Electron signals readiness, the main window is created, restoring its previous state if available. When the main window is created the React app first sets up the `Redux Store` to serve as memory storage, then the Loader module is initialized to load any other module.

The Loader component orchestrates the initialization of the application's modules, ensuring a structured boot sequence. It first loads static modules, followed by kernel and extra system modules, tracking progress through internal state. The Loader relies on the Store module to manage persistent data, utilizing a storage filesystem that maintains both workspace and current session information. This storage layer is accessed via hooks, allowing modules to read and write data as needed. Once all modules are loaded, the Loader constructs a dependency graph, representing relationships between modules and their reliance on the Loader itself. The boot process completes when the graph is populated and all modules are ready, providing a robust foundation for workspace and session management throughout the application lifecycle.

## New module

To create or inspect any model, first create the module object:

```js
import { IModule } from "@kernel/modules/base";

const MyModule: IModule = {
  name: "MyModule",
  version: "0.0.1",
  depends_on: ["Loader", "Store"], // adjust dependencies as needed
  // Add any managers, hooks, or kernelCalls if required
};

export default MyModule;
```

Register your model for booting in the App.tsx file:

```js
import myModule from '@system/modules/myModule'
const builtInModules: ModulesMap = {
    kernel: {
        // system logic
      [SVG.name]:SVG, 
      [pointerModule.name]:pointerModule, 
      [Markdown.name]:Markdown
    },
    system: {
        // business logic
      [converterModule.name]: converterModule, 
      [materialsModule.name]: materialsModule, 
      [composerModule.name]: composerModule, 
      [myModule.name]: myModule 
    },
  };
```

## Storage
The application has a filesystem organization to manage resources. The folder is structured as follows:
The application uses a local filesystem structure to manage all resources, sessions, and workspaces. All data is stored under the directory:

```
$HOME/klippel/envs/$ENV_NAME/
```

Within each environment, you will find:

- `logs/`: Kernel and application logs, organized by year, month, and day (e.g., `logs/kernel/2025/10/25/boot.log`).
- `workspaces/`: Contains all user workspaces, each with its own resources, models, materials, orders, and workflows. Workspace folders are further organized by type and unique identifiers.
- `.session/`: Session data is organized per module. Each module has its own folder (e.g., `.session/Store/`, `.session/Markdown/`, `.session/Converter/`, etc.), and stores its state and related files inside. For example, `.session/Store/state.json`, `.session/Markdown/state.json`, `.session/Materials/materials/10.json`, etc.

Example structure:
```bash
klippel tree .
└── envs
  ├── small-app
  │   ├── logs
  │   │   └── kernel
  │   │       └── 2025
  │   │           └── ...
  │   └── workspaces
  │       ├── bkp
  │       └── pessoal
  │           ├── Materials
  │           ├── Models
  │           ├── Orders
  │           └── Workflows
  │   └── .session
  │       ├── Store
  │       │   └── state.json
  │       ├── Markdown
  │       │   └── state.json
  │       ├── Materials
  │       │   └── materials
  │       │       ├── 10.json
  │       │       └── ...
  │       └── ...
  └── undefined
    ├── logs
    └── workspaces
```

### Storage API and Session Management

All file operations are routed through a secure Electron API, exposed to the React app via the preload script (`window.electron.storage`). This API provides methods for reading, writing, appending, copying, moving, deleting files, and ensuring directories. Session-specific methods include:

- `writeBlob(path, blob, options)`: Write binary or text data to a file.
- `readFile(path, options)`: Read file contents.
- `appendFile(path, blob, options)`: Append data to a file.
- `deleteFile(path)`: Remove a file.
- `ensureDir(path, options)`: Create directories as needed.
- `saveSession()`: Triggers a session save event.
- `registerSessionSaveListener(listener)`: Register a callback for session save events.
- `getAutoSaverInterval()`, `pauseAutoSessionSaver()`, `resumeAutoSessionSaver(interval)`: Manage session auto-save behavior.

### Session Load and Save Logic

Each module is responsible for loading and saving its own session data in its dedicated folder under `.session/`. For example, the Store module uses `.session/Store/state.json`, the Markdown module uses `.session/Markdown/state.json`, and so on. On startup, each module attempts to load its state from its respective file(s) using the storage API. When saving, the module serializes its current state and writes it to its own session file(s) via `writeBlob`. Session auto-saving is managed by Redux actions and can be paused or resumed as needed. This per-module structure ensures that workspace and session data are reliably persisted and restored, providing robust local-first data management and modular separation.

## Memory Management
The app leverages the Redux ecosystem to maintain a global state, serving as in-memory storage for all modules. The main Redux store is initialized in kernel/App.tsx, using the DynamicStore component to provide state management across the application.

Each module interacts with the store through the IModule interface, and can access or update state using custom hooks like useModule. Session data is persisted via the Electron storage API, which is accessed in module code such as Composer/store/models/slice.ts and Composer/store/variations/slice.ts.

Session auto-saving and restoration are managed by Redux actions and listeners, with each module saving its state to a dedicated file in the .session directory (see Storage API and Session Management above).

### Limitations
Redux cannot store non-serializable objects, such as React components or DOM nodes. Attempting to do so will result in errors or lost state. To overcome this, the app uses a React context registry to hold references to components and other non-serializable objects. This registry is initialized and managed alongside the Redux store, ensuring that UI components and other dynamic resources are properly tracked and accessible.

For more details, see:

DynamicStore component
StoreManager and registry
ComponentRegistryManager