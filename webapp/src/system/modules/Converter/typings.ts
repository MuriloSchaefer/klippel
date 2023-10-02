import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";


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

export interface NumeratorEdge extends Edge {
    type: 'NUMERATOR'
}
export interface DenominatorEdge extends Edge {
    type: 'DENOMINATOR'
}

export interface ConvertsToEdge extends Edge {
    type: 'CONVERTS_TO'
    factor: number
}
export interface BelongsToSerieEdge extends Edge {
    type: 'BELONGS_TO'
}

export type ConversionNodes = UnitNode | CompoundNode | ScaleNode
export type ConvertionEdges = NumeratorEdge | DenominatorEdge | ConvertsToEdge | BelongsToSerieEdge