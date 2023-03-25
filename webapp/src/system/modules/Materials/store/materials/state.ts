import { FibersABV } from "../../typings"

export type CompositionMap = {
    [abv in FibersABV]?: number
}

export interface MaterialState {
    id: number,
    type: string,
    schemaVersion: string
    suppliers: string[],
    industry: string,
    externalId: string,
    externalURL?: string,
    images: string[],
    description?: string,
    attributes: {
        [name: string]: any
    }
    caracteristics?: {
        [name: string]: any
    },
    composition?: CompositionMap,
}
export interface MaterialsState {
    [id: number]: MaterialState
}

export const initialState: MaterialsState = {}