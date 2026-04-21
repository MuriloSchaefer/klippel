import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { initialState } from "./state";
import { pushContainer, popContainer, focusContainer } from "./actions";

const slice = createSlice({
  name: MODULE_NAME,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(pushContainer, (state, action) => {
      const { id } = action.payload;
      if (!state.containerFocusStack.includes(id)) {
        state.containerFocusStack.push(id);
      }
    });

    builder.addCase(popContainer, (state, action) => {
      state.containerFocusStack = state.containerFocusStack.filter(
        (c) => c !== action.payload.id
      );
    });

    builder.addCase(focusContainer, (state, action) => {
      const { id } = action.payload;
      const idx = state.containerFocusStack.lastIndexOf(id);
      if (idx !== -1 && idx !== state.containerFocusStack.length - 1) {
        state.containerFocusStack.splice(idx, 1);
        state.containerFocusStack.push(id);
      }
    });
  },
});

export default slice;
