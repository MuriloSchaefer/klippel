export interface KernelUIState {
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
