import { createSlice } from "@reduxjs/toolkit";
import {
  storeSVG,
} from "./actions";
import { SVGModuleState } from "./state";

const initialState: SVGModuleState = {
  svgs: {},
};

export const MouseModuleSlice = createSlice({
  name: "SVGModule",
  initialState: initialState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(
        storeSVG,
        (state: SVGModuleState, { payload: { id, raw } }) => ({
          ...state,
          svgs: {
            ...state.svgs,
            [id]: {
              raw
            }
          },
        })
      )
  },
});

export default MouseModuleSlice.reducer;
