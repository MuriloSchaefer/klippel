import type { CompositionState } from "./composition/state"

export type CompositionsList = Pick<CompositionState, 'name' | 'descriptionPath' | 'svgPath'>[]
export type CompositionsMap = {[name: string]:CompositionState}

export interface CompositionsManagerState {
    compositions: CompositionsMap
    compositionsList: CompositionsList
}

export interface ComposerState {
    compositionsManager: CompositionsManagerState
}

export const initialState: ComposerState = {
    compositionsManager: {
        compositions: {},
        compositionsList: []
    }
}