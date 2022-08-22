import ViewportContentContext from "@kernel/contexts/viewports";
import {
  changeViewportTitle,
  leftPanelTitleChanged,
  rightPanelClosed,
  rightPanelTitleChanged,
} from "@kernel/layout/ations";
import { LeftPanelType } from "@kernel/layout/components/Sidepanels/contexts/LeftPanelContext";
import { RightPanelType } from "@kernel/layout/components/Sidepanels/contexts/RightPanelContext";
import useLeftPanel from "@kernel/layout/components/Sidepanels/hooks/useLeftPanel";
import useRightPanel from "@kernel/layout/components/Sidepanels/hooks/useRightPanel";
import { ViewportTabState } from "@kernel/layout/state";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import React, { useContext } from "react";

export interface ViewportData {
  state: ViewportTabState;
  content: React.ReactElement;
  hooks: {
    setContent(content: React.ReactElement): void;
    setTitle(title: string): void;
  }; // hooks to manipulate the viewport data
  panels: {
    left: {
      title: string;
      setTitle(title: string): void;
      content: React.ReactNode;
      setContent(panel: LeftPanelType): void;
    };
    right: {
      title: string;
      setTitle(title: string): void;
      content: React.ReactNode;
      setContent(panel: RightPanelType): void;
      close(): void;
    };
  };
}

/**
 * Retrieves the viewport info for the given viewport id.
 * @param id The viewport id.
 * @returns {ViewportData | undefined} The viewport info. Returns undefined if viewport isn't found
 */
const useViewport = (id: string): ViewportData | undefined => {
  const dispatch = useAppDispatch();
  const { viewports, setViewports } = useContext(ViewportContentContext);

  const {
    rightPanel,
    leftPanel,
    viewportManager: { tabs },
  } = useAppSelector((state) => state.kernelUI);

  const viewportState = tabs.find((tab: ViewportTabState) => tab.id === id);
  const viewportContent = viewports[id];
  if (!viewportContent || !viewportState) return undefined;

  const { leftPanel: leftContent, setLeftPanel } = useLeftPanel();
  const { rightPanel: rightContent, setRightPanel } = useRightPanel();

  return {
    state: viewportState,
    content: viewportContent,
    hooks: {
      setContent(content: React.ReactElement) {
        setViewports({ ...viewports, [id]: content });
      },
      setTitle(title: string) {
        dispatch(changeViewportTitle(title));
      },
    },
    panels: {
      left: {
        title: leftPanel.title,
        content: leftContent,
        setTitle: (title: string) => dispatch(leftPanelTitleChanged(title)),
        setContent: (panel: LeftPanelType) => setLeftPanel(panel),
      },
      right: {
        title: rightPanel.title,
        content: rightContent,
        setContent: (panel: RightPanelType) => setRightPanel(panel),
        setTitle: (title: string) => dispatch(rightPanelTitleChanged(title)),
        close: () => dispatch(rightPanelClosed()),
      },
    },
  };
};

/**
 * Retrieves the current viewport info.
 * @returns
 */
export const useActiveViewport = (): ViewportData => {
  const { activeTab } = useAppSelector(
    (state) => state.kernelUI.viewportManager
  );
  const viewport = useViewport(activeTab);
  if (!viewport) throw new Error("No active viewport");
  return viewport;
};

export default useViewport;
