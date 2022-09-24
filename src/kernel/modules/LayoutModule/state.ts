export interface ViewportTabState {
  id: string;
  title: string;
}

export interface ViewportManagerState {
  activeTab: string;
  tabs: ViewportTabState[];
}

export interface LayoutModuleState {
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
