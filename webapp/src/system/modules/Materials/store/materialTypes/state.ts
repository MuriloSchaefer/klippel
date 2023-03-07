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