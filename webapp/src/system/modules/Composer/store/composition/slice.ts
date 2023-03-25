import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { selectPart, unselectPart } from "./actions";
import { CompositionState } from "./state";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: {} as CompositionState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      selectPart,
      (state: CompositionState, { payload: { partName } }) => ({ ...state, selectedPart: partName })
    );
    builder.addCase(
        unselectPart,
        (state: CompositionState) => ({ ...state, selectedPart: undefined })
      );
  },
});

export default slice;
