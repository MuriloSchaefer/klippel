import { CSSProperties } from "react";

type Loader = 'not-started' | 'started' | 'completed'

export type ProxyAttrs = CSSProperties & {
    transform?: string;       // "translate(x,y) rotate(deg cx cy) scale(s)" — rotate about the element's bbox center
    "clip-path"?: string;     // e.g. "url(#logo-clip-…)"
}

export interface Proxies {
    [id: string]: ProxyAttrs
}

/**
 * An element injected into the editor SVG at render time that does NOT exist
 * in the source document (logo symbols/images, placement instances, clipPaths).
 * Non-destructive: the source document is never rewritten — these are layered
 * on in renderPreview and persist with the instance session as a render cache.
 */
export interface InjectedElement {
    id: string;                       // the element's id (also the mount key)
    mount: "defs" | "container";      // #svg-edit-defs vs. the editor content container
    markup: string;                   // sanitized SVG fragment (one root element)
    order?: number;                   // stable paint order within the mount
    // Optional paint-order anchor (container mount only): insert this element
    // immediately AFTER the element with this id, instead of appending at the
    // end of the editor content. Used so a clipped placement paints just above
    // its clip target (and below anything drawn after it) rather than on top of
    // the whole drawing. Falls back to append when the anchor id is not found.
    anchor?: string;
}

export interface InjectedMap {
    [id: string]: InjectedElement
}

export interface SVGInstance {
    pan: [number, number]
    zoom: number,
    proxies: Proxies
    injected?: InjectedMap
    content: string | undefined
}

export interface InstancesMap {
    [name: string]: SVGInstance
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