import { createSlice } from "@reduxjs/toolkit";
import { initialState, SellersState } from "./state";
import { materialsCatalogLoaded } from "../materials/actions";

const slice = createSlice({
  name: "sellersSlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(materialsCatalogLoaded, (_state, { payload }) =>
      payload.sellers as SellersState,
    );
  },
});

export default slice;
