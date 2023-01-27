import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { RibbonTabState } from "./state";
import {
  addRibbonTab,
  ribbonTabAdded,
  selectTab,
  tabSelected,
} from "./actions";
import { LayoutState } from "../state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: addRibbonTab,
  effect: async (
    { payload: { tab } }: PayloadAction<{ tab: RibbonTabState }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: { ribbonMenu: {tabs} },
    } = getState() as { Layout: LayoutState };
    dispatch(ribbonTabAdded({ tab: tabs[tab.name] })); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: selectTab,
  effect: async (
    { payload: { name } }: PayloadAction<{ name: string }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: { ribbonMenu: {tabs} },
    } = getState() as { Layout: LayoutState };
    dispatch(tabSelected({ tab: tabs[name] })); // dispatch event
  },
});

export default middlewares;
