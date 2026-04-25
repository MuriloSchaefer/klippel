import { createSelector } from "reselect";
import { MaterialsModuleState } from "../state";

const selectMaterialsModule = (state: {Materials: MaterialsModuleState}) => state.Materials;

export const selectMaterialTypes = createSelector(
    selectMaterialsModule, 
    (state: MaterialsModuleState | undefined) => state?.materialTypes
);
    
export const selectMaterialType = (type: string) => {
    return createSelector(
        selectMaterialsModule, 
        (state: MaterialsModuleState | undefined) => state?.materialTypes?.[type]
    );
}