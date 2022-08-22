import ViewportContentContext from "@kernel/contexts/viewports";
// import { Viewport } from "@kernel/layout/components/Viewport";
import {
  viewportAdded,
  viewportClosed,
  viewportSelected,
} from "@kernel/layout/ations";
import { ViewportManagerState } from "@kernel/layout/state";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import _ from "lodash";
import React, { useContext } from "react";

export interface ViewportManagerData {
  state: ViewportManagerState;
  hooks: {
    addViewport(title: string, content: React.ReactElement): void;
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
    (state) => state.kernelUI.viewportManager
  );

  const { viewports, setViewports } = useContext(ViewportContentContext);

  return {
    state: viewportManager,
    hooks: {
      addViewport(title: string, content: React.ReactElement) {
        const id = _.uniqueId("viewport_");
        dispatch(viewportAdded({ id, title }));
        setViewports({
          ...viewports,
          [id]: React.cloneElement(content, { id }), // inject the id in the content (viewport)
        });
      },
      removeViewport(id: string) {
        dispatch(viewportClosed(id));
        // setViewports({ ...viewports, [id]: content });
      },
      selectViewport(id: string) {
        dispatch(viewportSelected(id));
      },
    },
  };
};

export default useViewportManager;
