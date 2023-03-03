export interface MaterialType {
    name: string;
    label: string;
}
export interface MaterialTypesState {
    [name: string]: MaterialType
}

export const initialState = {}