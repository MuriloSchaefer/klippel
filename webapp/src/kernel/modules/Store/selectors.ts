import { createSelector } from "reselect"



export const selectModuleState = <State = any, Result = any>(moduleName: string, selector: (state: State) => Result) => {
    return createSelector((state: any) => state[moduleName], selector)
}