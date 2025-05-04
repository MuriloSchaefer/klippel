import type { BrowserWindowConstructorOptions } from "electron";

export const DEFAULT_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
  title: "Klippel app",
  x: 0,
  y: 0,
  width: 1280,
  height: 920,
  show: false,
  autoHideMenuBar: true,
};

export default DEFAULT_WINDOW_CONFIG
