import { UnitValue } from "@system/modules/Converter/typings"
import { FibersABV } from "../../typings"

export type CompositionMap = {
    [abv in FibersABV]?: number
}

export interface MaterialState{
    // Catalog rows are addressed by slug ids. Kept as `string`
    // end-to-end (the Jazz catalog, selectors, and Composer's material
    // nodes all use the slug verbatim).
    id: string,
    type: string,
    schemaVersion: string
    suppliers: string[],
    industry: string,
    externalId: string,
    externalURL?: string,
    images?: string[],
    description?: string,
    attributes: {
        [name: string]: any
    }
    caracteristics?: {
        [name: string]: any
    },
    composition?: CompositionMap,
    stock: UnitValue;
}
export interface MaterialsState {
    [id: string]: MaterialState
}

export const initialState: MaterialsState = {}