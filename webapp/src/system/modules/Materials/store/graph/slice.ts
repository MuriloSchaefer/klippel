import { createSlice } from "@reduxjs/toolkit";
import { initialState, MaterialsGraphState } from "./state";
import { materialsCatalogLoaded } from "../materials/actions";
import type { EdgeDTO } from "../../typings/catalog";

function buildAdjacency(edges: { [id: string]: EdgeDTO }): {
  [sourceId: string]: string[];
} {
  const out: { [sourceId: string]: string[] } = {};
  for (const edge of Object.values(edges)) {
    (out[edge.sourceId] ||= []).push(edge.id);
  }
  return out;
}

const slice = createSlice({
  name: "materialsGraphSlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(materialsCatalogLoaded, (_state, { payload }) => {
      const next: MaterialsGraphState = {
        edges: payload.edges,
        adjacencyList: buildAdjacency(payload.edges),
      };
      return next;
    });
  },
});

export default slice;
