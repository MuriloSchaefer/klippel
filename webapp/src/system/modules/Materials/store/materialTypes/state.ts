export type AttributeTypes = 'string' | 'number' | 'color' | 'date' | 'object';

export interface MaterialTypeSchema {
    version: string
    attributes: {
        [name: string]: any
    },
    selector: {
        principal: string
        extra: string
    }
    /**
     * Default unit (`UnitNode.id` from the conversion graph) for the
     * `stock` field on materials of this type. Optional for backward
     * compatibility with schemas authored before this lived in the
     * schema; the Add-material form falls back to a blank picker so
     * the user can still set it manually.
     */
    stockUnit?: string
    /**
     * Target unit (`UnitNode.id` from the conversion graph) for usage
     * calculations on materials of this type — what Composer converts
     * every `CONSUMES` edge into when computing usage per unit. Stock
     * is measured in what the material is bought/stored in (kg of
     * malha); consumption is often naturally expressed in something
     * else (metres per garment). Optional: when absent, consumers fall
     * back to `stockUnit` / the material's `stock.unit`, which is the
     * behaviour that predates this field.
     */
    consumptionUnit?: string
}
export interface SchemaMap {
    [version: string]: MaterialTypeSchema
}

export interface MaterialType {
    name: string;
    label: string;
    latestSchema: string;
    schemas: SchemaMap
    
    // costFunction: any // CHALLENGE: find a way to define its function (maybe an operation tree)
}
export interface MaterialTypesState {
    [name: string]: MaterialType
}

export const initialState = {}