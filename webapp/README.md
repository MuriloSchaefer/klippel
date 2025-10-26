# Webapp
Electron + React + Vite to build a descentrilized application capable of composing garment cloths. The system laverage the local computing power to perform its operations the storage is locally in the disks spread on files within the filesystem, something similar to what the linux kernel does.

## Running the app
```bash
$ npm i
$ npm start
```
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