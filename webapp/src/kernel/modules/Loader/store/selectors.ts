import { createSelector } from "reselect";
import { LoaderState } from "./state";


export const modulesCount = (state: LoaderState) => state.modulesCount