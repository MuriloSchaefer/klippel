import { createSlice } from "@reduxjs/toolkit";
import { materialTypesLoaded } from "./actions";
import { initialState, MaterialTypesState } from "./state";


const slice = createSlice({
    name: 'materialTypesSlice',
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialTypesLoaded,
        (state: MaterialTypesState, { payload }) => ({...state, ...payload}))
        
    //   builder.addDefaultCase((state, action)=>({
    //     ...state, 
    //     materialTypes: panelsSlice.reducer(state.materialTypes, action),
    //   }))
    }
})

export default slice;