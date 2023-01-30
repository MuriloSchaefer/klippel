import { PaletteMode } from "@mui/material";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { newComposition, compositionCreated } from "./actions";
import { ComposerState } from "./state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: newComposition,
  effect: async (
    { payload }: PayloadAction<{ name: string; svgPath: string }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    dispatch(
      compositionCreated(compositionsManager.compositions[payload.name])
    ); // dispatch event
    // TODO: dispath fetcher and parser
  },
});

export default middlewares;
