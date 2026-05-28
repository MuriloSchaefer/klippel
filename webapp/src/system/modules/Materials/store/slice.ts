import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { initialState, MaterialsModuleState } from "./state";
import materialTypesSlice from "./materialTypes/slice";
import materialsSlice from "./materials/slice";
import industriesSlice from "./industries/slice";
import sellersSlice from "./sellers/slice";
import graphSlice from "./graph/slice";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: {
    ...initialState,
    materials: materialsSlice.getInitialState(),
    materialTypes: materialTypesSlice.getInitialState(),
    industries: industriesSlice.getInitialState(),
    sellers: sellersSlice.getInitialState(),
    graph: graphSlice.getInitialState(),
  } as MaterialsModuleState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addDefaultCase((state, action) => ({
      ...state,
      materials: materialsSlice.reducer(state.materials, action),
      materialTypes: materialTypesSlice.reducer(state.materialTypes, action),
      industries: industriesSlice.reducer(state.industries, action),
      sellers: sellersSlice.reducer(state.sellers, action),
      graph: graphSlice.reducer(state.graph, action),
    }));
  },
});

export default slice;
