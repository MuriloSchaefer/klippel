import React, { createContext } from "react";

export type LeftPanelType = React.ReactNode;

export interface LeftPanelContextProps {
  leftPanel: LeftPanelType;
  setLeftPanel: (leftPanel: LeftPanelType) => void;
}

export const LeftPanelContext = createContext<LeftPanelContextProps>({
  leftPanel: null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLeftPanel: (_leftPanel: LeftPanelType) => null,
});
