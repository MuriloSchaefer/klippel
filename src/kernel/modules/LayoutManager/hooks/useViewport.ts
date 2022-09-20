import React, { useContext } from "react";

import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";

import ViewportContentContext from "../contexts/viewports";
import { changeViewportTitle } from "../ations";
import { ViewportTabState } from "../state";

export interface ViewportData {
  state: ViewportTabState;
  content: React.ReactElement;
  hooks: {
    setContent(content: React.ReactElement): void;
    setTitle(title: string): void;
  }; // hooks to manipulate the viewport data
}

/**
 * Retrieves the viewport info for the given viewport id.
 * @param id The viewport id.
 * @returns {ViewportData | undefined} The viewport info. Returns undefined if viewport isn't found
 */
const useViewport = (id: string): ViewportData | undefined => {
  const dispatch = useAppDispatch();
  const { viewports, setViewports } = useContext(ViewportContentContext);

  const tabs = useAppSelector(
    (state) => state.layoutManager.viewportManager.tabs
  );

  const viewportState = tabs.find((tab: ViewportTabState) => tab.id === id);
  const viewportContent = viewports[id];
  if (!viewportContent || !viewportState) return undefined;

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
  };
};

/**
 * Retrieves the current viewport info.
 * @returns
 */
export const useActiveViewport = (): ViewportData => {
  const activeTab = useAppSelector(
    (state) => state.layoutManager.viewportManager.activeTab
  );
  const viewport = useViewport(activeTab);
  if (!viewport) throw new Error("No active viewport");
  return viewport;
};

export default useViewport;
