import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { LayoutState } from "../state";
import { selectViewport, closeViewport, viewportSelected, viewportClosed, addViewport, viewportAdded } from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
    actionCreator: addViewport,
    effect: async ({payload: {name}}: PayloadAction<{ name: string }>, listenerApi) => {
      const { dispatch, getState} = listenerApi;
      const {Layout: {viewportManager: {viewports}}} = getState() as {Layout: LayoutState}
      dispatch(viewportAdded(viewports[name])) // dispatch event
    },
  });
middlewares.startListening({
  actionCreator: selectViewport,
  effect: async ({payload: {name}}: PayloadAction<{ name: string }>, listenerApi) => {
    const { dispatch, getState} = listenerApi;
    const {Layout: {viewportManager: {viewports}}} = getState() as {Layout: LayoutState}
    dispatch(viewportSelected(viewports[name])) // dispatch event
  },
});
middlewares.startListening({
    actionCreator: closeViewport,
    effect: async ({payload: {name}}: PayloadAction<{ name: string }>, listenerApi) => {
      const { dispatch} = listenerApi;
      dispatch(viewportClosed({name})) // dispatch event
    },
  });

export default middlewares;