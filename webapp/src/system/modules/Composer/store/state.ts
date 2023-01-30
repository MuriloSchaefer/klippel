

export interface CompositionState {
    name: string
    svgPath: string
    svgContent: undefined | string

}

export type CompositionsMap = {[name: string]:CompositionState}

export interface CompositionsManagerState {
    compositions: CompositionsMap
}

export interface ComposerState {
    compositionsManager: CompositionsManagerState
}

export const initialState: ComposerState = {
    compositionsManager: {
        compositions: {}
    }
}