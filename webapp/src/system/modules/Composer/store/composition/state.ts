import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";


export interface MaterialTypeNode extends Node {
    type: 'MATERIAL_TYPE'
    label: string
}
export interface GarmentNode extends Node {
    type: 'GARMENT'
    label: string;

}
export interface PartNode extends Node {
    type: 'PART'
    label: string;

}
export interface MaterialUsageNode extends Node {
    type: 'MATERIAL_USAGE'
    label: string
    editableAttributes: string[]
    materialId: string // TODO: add typing
    materialType: string
    proxies: {elem: string, attr: string}[]
}

export interface MaterialNode extends Node {
    type: 'MATERIAL'
    label: string
    materialId: number // TODO: add typing
}

export type RestrictionNode = AllowOnlyRestrictionNode | SameAsRestrictionNode
export interface AllowOnlyRestrictionNode<T=string> extends Node {
    type: 'RESTRICTION'
    restrictionType: 'allowOnly'
    allowOnly: T[]
}
export interface SameAsRestrictionNode<T=string> extends Node {
    type: 'RESTRICTION'
    restrictionType: 'sameAs'
    sameAs: T
}


export type CompositionNode = GarmentNode | MaterialTypeNode | PartNode | MaterialUsageNode | RestrictionNode

export interface MadeOfEdge extends Edge {
    type: 'MADE_OF'
}
export interface RestrictedByEdge extends Edge {
    type: 'RESTRICTED_BY'
    attr: string
}

export type CompositionEdge = RestrictedByEdge | MadeOfEdge

export type CompositionGraph = GraphState<CompositionNode, CompositionEdge>

type Loader = 'not-started' | 'started' | 'completed'
export interface CompositionState {
    name: string
    viewportName: string
    svgPath: string
    graphId: string
    selectedPart?: string
    loading: {
        loadSVG: Loader
        loadModel: Loader
    }
}

export const newCompositionState: Omit<CompositionState, 'name' | 'viewportName' | 'svgPath' | 'graphId'> = {
    loading: {
        loadSVG: 'not-started',
        loadModel: 'not-started'
    },
}