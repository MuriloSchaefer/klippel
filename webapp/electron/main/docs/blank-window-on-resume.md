# Blank window after laptop sleep/wake

## Symptom

On Linux, every time the laptop suspends and wakes up, the Electron window
renders as a fully blank white rectangle (only the native title bar and
`File / Edit / View / Window` menu remain). The app is still running — the
process is alive, MCP/CDP still respond — but the renderer never paints again
until the app is restarted or the page is manually reloaded.

## Root cause

This is Chromium's GPU-context-loss-on-suspend behavior on Linux, not a bug in
the React app.

1. On suspend, the kernel invalidates the DRM/GBM buffers that back Chromium's
   compositor surface. The GPU process loses its rendering context.
2. On resume, Chromium's renderer compositor does **not** reliably re-acquire a
   valid surface on Linux. It stops producing frames, so the window keeps
   showing the page background (white) — the DOM is still there, it just never
   gets composited.
3. `webapp/electron/main/index.ts` has **no recovery path**. There is:
   - no `powerMonitor` `resume` handler,
   - no `webContents.on("render-process-gone")` handler,
   - no `app.on("child-process-gone")` / `"render-process-gone"` handler.

   So once the renderer/GPU process is in the broken post-resume state, nothing
   ever forces it to recover. The dead surface persists indefinitely.

## Fix

Add a recovery path in `webapp/electron/main/index.ts` that reloads the renderer
when the system resumes and when a render/GPU process dies.

### 1. Reload on resume

Import `powerMonitor` and, inside `createWindow()` (after `mainWindow` is
created), listen for `resume`:

```ts
import { app, shell, BrowserWindow, Menu, Tray, powerMonitor } from "electron";

// ...inside createWindow(), after mainWindow is constructed:
powerMonitor.on("resume", () => {
  if (mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
  console.log("System resumed — reloading renderer");
  mainWindow.webContents.reload();
});
```

`reload()` re-runs the renderer entry and re-establishes a fresh compositor
surface. Because the app already persists state to `.session/` and saves on
`save-session`, a reload is non-destructive here.

### 2. Recover from a dead renderer/GPU process

As a belt-and-braces measure (the renderer can also be killed outright by the
GPU loss rather than just frozen):

```ts
mainWindow.webContents.on("render-process-gone", (_event, details) => {
  console.error("Renderer gone:", details.reason);
  if (!mainWindow.isDestroyed()) mainWindow.reload();
});
```

### Alternative / fallback options

If reloading proves disruptive (e.g. unsaved transient UI state), the
heavier-handed mitigations are:

- **Disable GPU compositing** — keeps software compositing alive across
  suspend, at a performance cost:
  ```ts
  app.commandLine.appendSwitch("disable-gpu-compositing");
  ```
- **Disable hardware acceleration entirely**:
  ```ts
  app.disableHardwareAcceleration();
  ```
  Must be called before `app.whenReady()`.

The `resume` + `render-process-gone` reload approach is preferred — it keeps GPU
acceleration on and only pays a cost on the (infrequent) resume event.

## Recommended change

Apply both handlers from sections 1 and 2 in `createWindow()`. This is the
minimal change that makes the window self-heal on wake without sacrificing GPU
acceleration during normal use.
