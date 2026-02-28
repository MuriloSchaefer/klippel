import { createSelector } from "reselect";
import { MaterialsModuleState } from "../state";
import { MaterialsState } from "./state";

const defaultSelector = (state: MaterialsState) => state;
export type MaterialSelector = (state: MaterialsState) => MaterialsState;
export const selectMaterials = (selector?: MaterialSelector) => {
  const usedSelector = selector ?? defaultSelector;

  return createSelector(
    (state: { Materials: MaterialsModuleState }) => state.Materials,
    (state: MaterialsModuleState) => state.materials,
    (state) => state && usedSelector(state.materials),
  );
};
