import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";


export type Unit = string;
export type Scale = {
    name: string;
    base: Unit
    factors: {
        [unit: Unit]: number
    }
}

export interface UnitValue {
    unit: Unit;
    amount: number;
}

export interface CompoundValue {
    quotient: UnitValue;
    dividend: UnitValue;
}

export type Value = UnitValue | CompoundValue



// Graph nodes
export interface UnitNode extends Node {
    type: 'UNIT'
    abbreviation: Unit
    name: string 
}

export interface CompoundNode extends Node {
    type: 'COMPOUND_UNIT'
    abbreviation: Unit
    name: string 
}
export interface ScaleNode extends Node {
    type: 'SCALE'
    name: string
}

export interface QuotientEdge extends Edge {
    type: 'QUOTIENT'
}
export interface DividendEdge extends Edge {
    type: 'DIVIDEND'
}

export interface LinearConversion extends Edge {
    type: 'CONVERTS_TO'
    conversionType: 'multiplication' | 'division' 
    factor: number
}

export interface ParametrizedConversion extends Edge {
    type: 'CONVERTS_TO'
    conversionType: 'parametrized'
    expression: string
    params?: {
        [name: string]: string
    }
}

export type ConvertsToEdge = LinearConversion | ParametrizedConversion
export interface BelongsToSerieEdge extends Edge {
    type: 'BELONGS_TO'
}

export type ConversionNodes = UnitNode | CompoundNode | ScaleNode
export type ConvertionEdges = QuotientEdge | DividendEdge | ConvertsToEdge | BelongsToSerieEdge

export type ConversionGraph = GraphState<ConversionNodes, ConvertionEdges>;

export type NodeNScale = UnitNode & {
    scale?: ScaleNode;
  };