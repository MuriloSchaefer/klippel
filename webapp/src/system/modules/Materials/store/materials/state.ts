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
    /** Supplier product photo / colour swatch. */
    imageURL?: string,
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
    /**
     * This row's data is not in the mirror — it was evicted, or has not
     * arrived yet, and only its position in the view is known. Set exclusively
     * by `placeholderRow` (store/window/selectors.ts); every other field is a
     * filler the UI must not display.
     *
     * Consumers that render a row have to check it (`isPlaceholder`). Nothing
     * else may set it, and it never reaches the catalog.
     */
    placeholder?: true;
}
export interface MaterialsState {
    [id: string]: MaterialState
}

export const initialState: MaterialsState = {}