import React, { createContext, useContext } from "react";

export type LeftPanelType = {
  title: string;
  content: React.ReactNode;
};

export interface LeftPanelContextProps {
  leftPanel: LeftPanelType;
  setLeftPanel: (leftPanel: LeftPanelType) => void;
}

export const LeftPanelContext = createContext<LeftPanelContextProps>({
  leftPanel: { title: "", content: null },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLeftPanel: (_leftPanel: LeftPanelType) => null,
});
export const useLeftPanel = () => useContext(LeftPanelContext);
