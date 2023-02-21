import { CSSProperties } from "react";

type Loader = 'not-started' | 'started' | 'completed'

interface Proxies {
    [id: string]: CSSProperties
} 
export interface SVGState {
    progress: Loader
    path: string;
    proxies: Proxies;
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
    proxies: {},
    content: undefined,
}

export const initialState = {
    svgs: {}
}

export default initialState