
type Loader = 'not-started' | 'started' | 'completed'
export interface CompositionState {
    name: string
    svgPath: string
    graphId: string
    loading: {
        loadSVG: Loader
        parseSVG: Loader
    }
}

export type CompositionsMap = {[name: string]:CompositionState}

export interface CompositionsManagerState {
    compositions: CompositionsMap
}

export interface ComposerState {
    compositionsManager: CompositionsManagerState
}

export const newCompositionState: Omit<CompositionState, 'name' | 'svgPath' | 'graphId'> = {
    loading: {
        loadSVG: 'not-started',
        parseSVG: 'not-started'
    }
}

export const initialState: ComposerState = {
    compositionsManager: {
        compositions: {}
    }
}