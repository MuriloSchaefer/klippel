import {initialState as materialTypesInitialState, MaterialTypesState} from './materialTypes/state'

export interface MaterialsState {
    materialTypes: MaterialTypesState
}

export const initialState: MaterialsState = {
    materialTypes: materialTypesInitialState
}