import { createSelector } from "reselect";
import { MaterialsModuleState } from "../state";
import { MaterialsState } from "./state";


export type MaterialSelector = (state: MaterialsState) => MaterialsState
export const selectMaterials = (selector: MaterialSelector) => {

    const defaultSelector = (state: MaterialSelector) => state
    const usedSelector = selector ?? defaultSelector
    
  return createSelector(
    (state: { Materials: MaterialsModuleState }) => state.Materials,
    (state: MaterialsModuleState) => state.materials,
    (state) => state && usedSelector(state.materials)
  );
};
