import { FloatingShortcutsHashMap } from "./store/state";

export interface IShortcutsManager {
  state: FloatingShortcutsHashMap | undefined;
  hooks: {
    // shortcuts hooks
    createShortcuts(id: string, content?: unknown): void;
    deleteShortcuts(id: string): void;
  };
}

export interface IDocumentationManager {
  hooks: {
    // documentation hooks
    showFloatingDocumentation(e: MouseEvent, content: string): void;
    closeFloatingDocumentation(): void;
  };
}
