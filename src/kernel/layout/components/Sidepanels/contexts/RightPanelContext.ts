import React, { createContext } from "react";

export type RightPanelType = {
  title: string;
  content: React.ReactNode;
};

export interface RightPanelContextProps {
  rightPanel: RightPanelType;
  setRightPanel: (leftPanel: RightPanelType) => void;
}

export const RightPanelContext = createContext<RightPanelContextProps>({
  rightPanel: { title: "", content: null },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setRightPanel: (_leftPanel: RightPanelType) => null,
});
