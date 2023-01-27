import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { addRibbonTab, selectTab} from "./actions";
import { RibbonMenuState } from "./state";


const slice = createSlice<RibbonMenuState, SliceCaseReducers<RibbonMenuState>, string>({
    name: `${MODULE_NAME}RibbonMenu`,
    initialState: {
      activeTab: "home",
      tabs: {}
    },
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(addRibbonTab, (state:RibbonMenuState,{ payload: {tab} }) => {
        const {name} = tab
        return {...state, tabs: {...state.tabs, [name]: tab}}
      })
      builder.addCase(selectTab, (state:RibbonMenuState,{ payload: {name} }) => {
        return {...state, activeTab: name}
      })
    }
})

export default slice;