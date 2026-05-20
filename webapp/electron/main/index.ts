import { app, shell, BrowserWindow, Menu, Tray, powerMonitor } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
const { updateElectronApp } = require("update-electron-app");
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

import { getAbsPath, initStorageHooks } from "./storage";
import { startMcpServer } from "./mcp";
import initScheduler from "./scheduler";
import { initJazzHooks } from "./jazz-hooks";
import { closeActiveWorkspace } from "./jazz";
import { existsSync, ensureDirSync, outputFile, readdirSync, readFileSync } from "fs-extra";
import DEFAULT_WINDOW_CONFIG from "./defaultWindow";
import { debounce } from "./utils";
import { initHeliaHooks, initHeliaNode } from "./ipfs";

// Swallow EPIPE on stdout/stderr writes. When the parent process closes
// the inherited stdio pipe (Jest harness disconnects, VS Code debugger
// detaches, a `npm run` wrapper exits) any console.log that lands during
// Electron's own shutdown raises `write EPIPE` and Electron's default
// uncaught-exception handler pops a modal dialog — blocking shutdown
// every time. The pipe is gone anyway, so silently dropping the write
// is the right contract.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") return;
  // Re-throw anything else so genuine I/O errors still surface.
  throw err;
});
process.stderr.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") return;
  throw err;
});

updateElectronApp();
if (require("electron-squirrel-startup")) app.quit();

// Allow a per-instance CDP port so the collaborative-test harness (and
// manual two-window testing) can spawn multiple Electron processes side by
// side without colliding on 9222.
const CDP_PORT = process.env.KLIPPEL_CDP_PORT ?? '9222';
app.commandLine.appendSwitch('remote-debugging-port', CDP_PORT);
process.env.CDP_PORT = CDP_PORT;

// Each Electron instance needs its own `userData` directory or they fight
// over Chromium's profile lock. Default behavior is unchanged
// (`~/.config/Klippel`); the harness and manual two-window testing pass
// `KLIPPEL_USER_DATA_DIR` to point each peer at a distinct dir.
if (process.env.KLIPPEL_USER_DATA_DIR) {
  app.setPath("userData", process.env.KLIPPEL_USER_DATA_DIR);
}

async function createTray(mainWindow: BrowserWindow): Promise<Tray> {
  const tray = new Tray('');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: function () {
        mainWindow.show();
      },
    },
    {
      label: "Quit",
      click: function () {
        if (process.platform !== "darwin") {
          mainWindow.close()
          app.quit();
        }
      },
    },
  ]);
  tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
  return tray;
}

async function createWindow(): Promise<BrowserWindow> {
  // Create the browser window.
  const windowConfigLocation = getAbsPath(".session/window.json");
  const hasPreviousSession = existsSync(windowConfigLocation);
  let config = DEFAULT_WINDOW_CONFIG;
  if (!hasPreviousSession) {
    await outputFile(
      windowConfigLocation,
      JSON.stringify(DEFAULT_WINDOW_CONFIG)
    );
  } else {
    config = JSON.parse(
      readFileSync(windowConfigLocation, { encoding: "utf-8" })
    ) as typeof DEFAULT_WINDOW_CONFIG;
  }
  const saveWindowState = debounce(() => {
    if (mainWindow.isDestroyed()) return;
    const newWindowConfig: typeof DEFAULT_WINDOW_CONFIG = {
      ...mainWindow.getBounds(),
      title: mainWindow.title,
    };
    console.log("Saving new Window state", newWindowConfig);
    outputFile(windowConfigLocation, JSON.stringify(newWindowConfig));
  }, 100);


  ensureDirSync(getAbsPath('workspaces'));
  let workspace = readdirSync(getAbsPath('workspaces'))[0]
  const storeStatePath = getAbsPath('.session/Store/state.json');
  if (existsSync(storeStatePath)) {
    const raw = readFileSync(storeStatePath).toString().trim();
    if (raw) workspace = JSON.parse(raw).selectedWorkspace ?? workspace;
  }
  // const helia = await initHeliaNode(workspace)
  const scheduler = initScheduler();
  
  // if (helia){
  //   helia.start()
  //   initHeliaHooks(helia)
  //   console.debug("Helia node started. PeerId: ", helia.libp2p.peerId.toString())
  // }

  const mainWindow = new BrowserWindow({
    ...config,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });
  initStorageHooks(scheduler, mainWindow);
  initJazzHooks();
  // const eo = await initOllama()
  // console.log(eo)

  mainWindow.on("ready-to-show", () => {
    mainWindow.showInactive();
  });

  // On Linux, suspend invalidates the GPU compositor surface and the renderer
  // never re-acquires one on resume, leaving a blank white window. Reload to
  // re-establish a fresh surface; state is already persisted to .session/.
  powerMonitor.on("resume", () => {
    if (mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
    console.log("System resumed — reloading renderer");
    mainWindow.webContents.reload();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer gone:", details.reason);
    if (!mainWindow.isDestroyed()) mainWindow.reload();
  });
  mainWindow.on("resize", () => {
    console.log("resized");
    saveWindowState();
  });
  mainWindow.on("move", () => {
    console.log("moved");
    saveWindowState();
  });
  const onClose =  (event: any) => {
    event?.preventDefault();
    if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("save-session");
    }
    app.quit();
    if (!mainWindow.isDestroyed()) mainWindow.hide();
  }
  mainWindow.on("close",onClose);
  app.on('before-quit', async () => {
    mainWindow.removeListener('close', onClose)
    await closeActiveWorkspace();
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // React/Redux DevTools registration races the GPU process under Xvfb
  // — their service-worker init hangs without a real compositor, the
  // collaborative harness then times out waiting for CDP, and Electron
  // bails with `Failed to shutdown`. Skip extension install in any
  // headless e2e environment; nothing in the test path needs them.
  const skipDevExtensions =
    process.env.KLIPPEL_USE_XVFB === "1" ||
    process.env.KLIPPEL_E2E_SKIP_DEV_EXTENSIONS === "1";
  if (!skipDevExtensions) {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((ext) => console.log(`Added Extension:  ${ext.name} (${ext.version})`))
      .catch((err) => console.error("An error occurred: ", err));

    installExtension(REDUX_DEVTOOLS)
      .then((ext) => console.log(`Added Extension:  ${ext.name} (${ext.version})`))
      .catch((err) => console.error("An error occurred: ", err));
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  console.log("creating windows");
  const mainWindow = await createWindow();

  if (process.argv.includes('--mcp')) {
    await mainWindow.webContents.executeJavaScript('undefined');
    await startMcpServer();
  }
  // createTray(mainWindow);

  app.on("activate", async function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const mainWindow = await createWindow();
      // createTray(mainWindow);
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
