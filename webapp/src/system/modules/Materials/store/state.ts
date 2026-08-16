import {
  initialState as materialTypesInitialState,
  MaterialTypesState,
} from "./materialTypes/state";
import {
  initialState as materialsInitialState,
  MaterialsState,
} from "./materials/state";
import {
  initialState as industriesInitialState,
  IndustriesState,
} from "./industries/state";
import {
  initialState as sellersInitialState,
  SellersState,
} from "./sellers/state";
import {
  initialState as windowInitialState,
  MaterialsWindowState,
} from "./window/state";
import {
  initialState as residencyInitialState,
  ResidencyState,
} from "./residency/state";

export interface MaterialsModuleState {
  materials: MaterialsState;
  materialTypes: MaterialTypesState;
  industries: IndustriesState;
  sellers: SellersState;
  /**
   * No `graph` key, deliberately. The catalog's relation graph is a graph,
   * and graphs live in the Graph module — `store/graph/middlewares.ts` keeps
   * it there under `CATALOG_GRAPH_ID` and this module reads it through
   * `getGraphState`, like every other consumer of a graph.
   */
  /**
   * Shape of the catalog mirror — counts, paging cursor, current view order.
   * `materials` holds a *page*, so nothing about catalog size is derivable
   * from it any more.
   */
  window: MaterialsWindowState;
  /**
   * Who still needs each resident row — ref counts, last-read times, and the
   * TTL / sweep knobs. Drives eviction; nothing renders from it.
   */
  residency: ResidencyState;
}

export const initialState: MaterialsModuleState = {
  materials: materialsInitialState,
  materialTypes: materialTypesInitialState,
  industries: industriesInitialState,
  sellers: sellersInitialState,
  window: windowInitialState,
  residency: residencyInitialState,
};
