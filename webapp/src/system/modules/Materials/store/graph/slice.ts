import { createSlice } from "@reduxjs/toolkit";
import { initialState, MaterialsGraphState } from "./state";
import {
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
} from "../materials/actions";
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
    builder.addCase(materialsCatalogDeltaLoaded, (state, { payload }) => {
      if (payload.full) {
        return {
          edges: payload.full.edges,
          adjacencyList: buildAdjacency(payload.full.edges),
        };
      }
      const changed = payload.edges ?? {};
      const removed = payload.removedEdges ?? [];
      if (!Object.keys(changed).length && !removed.length) return state;

      const edges = { ...state.edges, ...changed };
      for (const id of removed) delete edges[id];
      // Adjacency is rebuilt in full rather than patched: it is a single
      // linear pass over the edge set, and a targeted rebuild would have to
      // rescan every edge of each touched source anyway.
      return { edges, adjacencyList: buildAdjacency(edges) };
    });
  },
});

export default slice;
