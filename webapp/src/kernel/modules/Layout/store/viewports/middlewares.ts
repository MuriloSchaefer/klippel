import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { LayoutState } from "../state";
import {
  selectViewport,
  closeViewport,
  viewportSelected,
  viewportClosed,
  addViewport,
  viewportAdded,
  addToGroup,
  addedToGroup,
  removeFromGroup,
  removedFromGroup,
  setExtrasViewport,
  ExtrasViewportSet,
  setViewportHasChanged,
  viewportHasChangedSet,
} from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: addViewport,
  effect: async ({ payload: { name } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { viewports },
      },
    } = getState() as { Layout: LayoutState };
    dispatch(viewportAdded(viewports[name])); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: selectViewport,
  effect: async ({ payload: { name } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { viewports },
      },
    } = getState() as { Layout: LayoutState };
    dispatch(viewportSelected(viewports[name])); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: closeViewport,
  effect: async ({ payload: { name } }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(viewportClosed({ name })); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: setExtrasViewport,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(ExtrasViewportSet(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: addToGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(addedToGroup(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: removeFromGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getOriginalState } = listenerApi;
    // Was re-dispatching the *command*, which re-entered this listener until the
    // stack blew. Emit the event instead, and read the group from the
    // pre-reducer state — by now `group` has already been cleared.
    const {
      Layout: {
        viewportManager: { viewports },
      },
    } = getOriginalState() as { Layout: LayoutState };
    dispatch(
      removedFromGroup({
        viewportName: payload.viewportName,
        groupName: viewports[payload.viewportName]?.group ?? "",
      }),
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: setViewportHasChanged,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { dirtyViewports },
      },
    } = getState() as { Layout: LayoutState };
    dispatch(viewportHasChangedSet({ name: payload.name, hasChanged: dirtyViewports[payload.name] ?? false })); // dispatch event
  },
});

export default middlewares;
