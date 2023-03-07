import {initialState as materialTypesInitialState, MaterialTypesState} from './materialTypes/state'
import {initialState as materialsInitialState, MaterialsState} from './materials/state'

export interface MaterialsModuleState {
    materials: MaterialsState
    materialTypes: MaterialTypesState
}

export const initialState: MaterialsModuleState = {
    materials: materialsInitialState,
    materialTypes: materialTypesInitialState
}