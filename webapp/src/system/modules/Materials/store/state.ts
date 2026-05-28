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
  initialState as graphInitialState,
  MaterialsGraphState,
} from "./graph/state";

export interface MaterialsModuleState {
  materials: MaterialsState;
  materialTypes: MaterialTypesState;
  industries: IndustriesState;
  sellers: SellersState;
  graph: MaterialsGraphState;
}

export const initialState: MaterialsModuleState = {
  materials: materialsInitialState,
  materialTypes: materialTypesInitialState,
  industries: industriesInitialState,
  sellers: sellersInitialState,
  graph: graphInitialState,
};
