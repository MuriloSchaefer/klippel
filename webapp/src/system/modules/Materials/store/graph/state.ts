import type { EdgeDTO } from "../../typings/catalog";

export interface MaterialsGraphState {
  edges: { [id: string]: EdgeDTO };
  /** sourceId → [edgeId] — derived from `edges` on every replace. */
  adjacencyList: { [sourceId: string]: string[] };
}

export const initialState: MaterialsGraphState = {
  edges: {},
  adjacencyList: {},
};
