export interface ViewportTabState {
  id: string;
  title: string;
}

export interface ViewportManagerState {
  activeTab: string;
  tabs: ViewportTabState[];
}

export interface KernelUI {
  viewportManager: ViewportManagerState;
  leftPanel: {
    isOpen: boolean;
    title: string;
    content: unknown;
  };
  rightPanel: {
    isOpen: boolean;
    title: string;
    content: unknown;
  };
}
