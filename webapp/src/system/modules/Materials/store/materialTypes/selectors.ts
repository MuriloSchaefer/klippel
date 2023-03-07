import { createSelector } from "reselect";
import { MaterialsModuleState } from "../state";

export const selectMaterialTypes = createSelector(
    (state: {Materials: MaterialsModuleState}) => state.Materials, 
    (state: MaterialsModuleState) => state.materialTypes
    )
    
export const selectMaterialType = (type: string) => {
    return createSelector(
        (state: {Materials: MaterialsModuleState}) => state.Materials, 
        (state: MaterialsModuleState) => state.materialTypes[type]
        )
}