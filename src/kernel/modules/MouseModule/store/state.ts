export interface FloatingDocumentationState {
  visible: boolean;
  content: unknown;
}

export interface FloatingShortcuts {
  visible: boolean;
}

export interface FloatingShortcutsHashMap {
  [id: string]: FloatingShortcuts;
}

export interface MouseModuleState {
  mousePosition: {
    x: number;
    y: number;
  };
  documentation: FloatingDocumentationState;
  shortcuts: FloatingShortcutsHashMap;
}
