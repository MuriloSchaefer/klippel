import _ from "lodash";
import React, { useContext } from "react";

import { useAppDispatch, useAppSelector } from "@kernel/store (deprecated)/hooks";

import ViewportContentContext from "../contexts/viewports";
import { ViewportManagerState } from "../state";
import { viewportAdded, viewportClosed, viewportSelected } from "../ations";

export interface ViewportManagerData {
  state: ViewportManagerState;
  hooks: {
    addViewport(title: string, type: string, content: React.ReactElement): void;
    removeViewport(id: string): void;
    selectViewport(id: string): void;
  }; // hooks to manipulate the viewports
}

/**
 * Retrieves the viewport manager.
 * @returns {ViewportManagerData} The viewport info.
 */
export const useViewportManager = (): ViewportManagerData => {
  const dispatch = useAppDispatch();

  const viewportManager = useAppSelector<ViewportManagerState>(
    (state) => state.LayoutModule.viewportManager
  );

  const { viewports, setViewports } = useContext(ViewportContentContext);

  return {
    state: viewportManager,
    hooks: {
      addViewport(title: string, type: string, content: React.ReactElement) {
        const id = _.uniqueId("viewport_");
        dispatch(viewportAdded({ id, viewportType: type, title }));
        setViewports({
          ...viewports,
          [id]: React.cloneElement(content, { id }), // inject the id in the content (viewport)
        });
      },
      removeViewport(id: string) {
        dispatch(viewportClosed(id));
      },
      selectViewport(id: string) {
        dispatch(viewportSelected(id));
      },
    },
  };
};

export default useViewportManager;
