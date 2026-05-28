import { UnitValue } from "@system/modules/Converter/typings"
import { FibersABV } from "../../typings"

export type CompositionMap = {
    [abv in FibersABV]?: number
}

export interface MaterialState{
    // Legacy fixtures use numeric ids; Jazz-backed catalog rows use
    // slugs. Legacy consumers (Composer's material list) still treat
    // this as a `number` — we type-cheat at the boundary in
    // `catalogAdapter.ts` rather than fan a `string | number` through
    // every selector.
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