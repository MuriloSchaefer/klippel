import type { IpcMain } from "electron";

export type MainModuleConfig = {
  name: string;
  registerIpc?: (ctx: { ipcMain: IpcMain }) => void;
  workspaceResolve?: () => Record<string, unknown>;
  onWorkspaceLoaded?: (handle: unknown) => void | Promise<void>;
  onWorkspaceClose?: () => void | Promise<void>;
  syncPreloadResolve?: () => Record<string, unknown>;
};

const modules: MainModuleConfig[] = [];

export function registerMainModule(config: MainModuleConfig): void {
  if (modules.some((m) => m.name === config.name)) {
    console.warn(`[main-modules] duplicate registration for "${config.name}" — ignored`);
    return;
  }
  modules.push(config);
}

export function getMainModules(): readonly MainModuleConfig[] {
  return modules;
}
