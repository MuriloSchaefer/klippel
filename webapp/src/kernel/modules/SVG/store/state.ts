
type Loader = 'not-started' | 'started' | 'completed'

export interface SVGState {
    progress: Loader
    path: string;
    content: string | undefined;
}

export interface SVGMap {
    [path: string]: SVGState
}

export interface SVGModuleState{
    svgs: SVGMap
}

export const newSVGState: Omit<SVGState, 'path'> = {
    progress: 'not-started',
    content: undefined
}

export const initialState = {
    svgs: {}
}

export default initialState