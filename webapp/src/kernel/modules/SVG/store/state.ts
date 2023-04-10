import { CSSProperties } from "react";

type Loader = 'not-started' | 'started' | 'completed'

export interface Proxies {
    [id: string]: CSSProperties
} 

export interface Settings {
    pan: [number, number]
    zoom: number,
    proxies: {
        [name: string]: Proxies
    }
}

interface InstancesMap {
    [name: string]: Settings
}
export interface SVGState {
    progress: Loader
    path: string;
    instances: InstancesMap;
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
    instances: {},
    content: undefined,
}

export const initialState = {
    svgs: {}
}

export default initialState