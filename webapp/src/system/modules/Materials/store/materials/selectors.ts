import { createSelector } from "reselect";
import { MaterialsModuleState } from "../state";
import { MaterialsState } from "./state";

export type MaterialSelector = (state: MaterialsState) => MaterialsState;

const selectMaterialsModule = (state: { Materials: MaterialsModuleState }) => state.Materials;
const selectMaterialsState = createSelector(
  selectMaterialsModule,
  (state: MaterialsModuleState | undefined) => state?.materials
);

export const selectMaterials = (selector?: MaterialSelector) => {
  if (!selector) return selectMaterialsState;

  return createSelector(
    selectMaterialsState,
    (materials: MaterialsState | undefined) => materials ? selector(materials) : undefined
  );
};
