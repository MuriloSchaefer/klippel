import type { PaletteMode } from "@mui/material";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { switchTheme, themeSwitched } from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: switchTheme,
  effect: async ({payload}: PayloadAction<{ theme: PaletteMode }>, listenerApi) => {
    const { dispatch} = listenerApi;
    localStorage.setItem('theme', payload.theme)
    dispatch(themeSwitched(payload)) // dispatch event
  },
});

export default middlewares;