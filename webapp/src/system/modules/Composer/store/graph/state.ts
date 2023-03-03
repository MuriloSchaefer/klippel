import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";


export interface MaterialTypeNode extends Node {
    type: 'MATERIAL_TYPE'
    label: string
}
export interface PartNode extends Node {
    type: 'PART'
    label: string;

}
export interface MaterialUsageNode extends Node {
    type: 'MATERIAL_USAGE'
    label: string
    editableAttributes: string[]
    material: any // TODO: add typing
    materialType: string
}


export type CompositionNode = MaterialTypeNode | PartNode | MaterialUsageNode



export interface MadeOfEdge extends Edge {
    type: 'MADE_OF'
}
export interface RestrictedByEdge extends Edge {
    type: 'RESTRICTED_BY'
    attr: string
}

export type CompositionEdge = RestrictedByEdge | MadeOfEdge

export type CompositionGraph = GraphState<CompositionNode, CompositionEdge>