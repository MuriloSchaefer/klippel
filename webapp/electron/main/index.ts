import { app, shell, BrowserWindow, Menu, Tray } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
const { updateElectronApp } = require("update-electron-app");
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { getAbsPath, initStorageHooks } from "./storage";
import initScheduler from "./scheduler";
import { existsSync, outputFile, readFileSync } from "fs-extra";
import DEFAULT_WINDOW_CONFIG from "./defaultWindow";
import { debounce } from "./utils";
import antaPng from "../assets/anta.png?asset"

updateElectronApp();
if (require("electron-squirrel-startup")) app.quit();

async function createTray(mainWindow: BrowserWindow): Promise<Tray> {
  const tray = new Tray(
    antaPng
  );
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
    const newWindowConfig: typeof DEFAULT_WINDOW_CONFIG = {
      ...mainWindow.getBounds(),
      title: mainWindow.title,
    };
    console.log("Saving new Window state", newWindowConfig);
    outputFile(windowConfigLocation, JSON.stringify(newWindowConfig));
  }, 100);

  const mainWindow = new BrowserWindow({
    ...config,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });
  const scheduler = initScheduler();
  initStorageHooks(scheduler, mainWindow);

  mainWindow.on("ready-to-show", () => {
    mainWindow.showInactive();
  });
  mainWindow.on("resize", () => {
    console.log("resized");
    saveWindowState();
  });
  mainWindow.on("move", () => {
    console.log("moved");
    saveWindowState();
  });
  const onClose =  (event) => {
    event?.preventDefault();
    mainWindow.webContents.send("save-session");
    mainWindow.hide();
  }
  mainWindow.on("close",onClose);
  app.on('before-quit', () => {
    mainWindow.removeListener('close', onClose)
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
  // make it work in amd gpus
  // app.disableHardwareAcceleration();
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.error("An error occurred: ", err));

  installExtension(REDUX_DEVTOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.error("An error occurred: ", err));

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  console.log("creating windows");
  const mainWindow = await createWindow();
  createTray(mainWindow);

  app.on("activate", async function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const mainWindow = await createWindow();
      createTray(mainWindow);
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
