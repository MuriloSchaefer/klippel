import { createSelector } from "reselect";
import { MaterialsState } from "../state";

export const selectMaterialTypes = createSelector(
    (state: {Materials: MaterialsState}) => state.Materials, 
    (state: MaterialsState) => state.materialTypes
    )
    
