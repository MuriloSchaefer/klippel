import React, { createContext } from "react";

export type RightPanelType = React.ReactNode;

export interface RightPanelContextProps {
  rightPanel: RightPanelType;
  setRightPanel: (leftPanel: RightPanelType) => void;
}

export const RightPanelContext = createContext<RightPanelContextProps>({
  rightPanel: null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRightPanel: (_leftPanel: RightPanelType) => null,
});
