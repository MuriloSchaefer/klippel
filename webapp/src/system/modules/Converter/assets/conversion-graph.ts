import { GraphState } from "@kernel/modules/Graphs/store/state"
import { ConversionNodes, ConvertionEdges } from "../typings"


const graph: GraphState<ConversionNodes, ConvertionEdges> = {
    id: 'conversion-graph',
    nodes: {
        'tempo-s': {
            type: 'UNIT',
            id: 'tempo-s',
            name: 'segundos',
            abbreviation: 's'
        },
        'tempo-m': {
            type: 'UNIT',
            id: 'tempo-m',
            name: 'minutos',
            abbreviation: 'm'
        },
        'tempo-h': {
            type: 'UNIT',
            id: 'tempo-h',
            name: 'horas',
            abbreviation: 'h'
        },
        'tempo-d': {
            type: 'UNIT',
            id: 'tempo-d',
            name: 'dias',
            abbreviation: 'd'
        },
        'tempo-sem': {
            type: 'UNIT',
            id: 'tempo-sem',
            name: 'semanas',
            abbreviation: 'sem'
        },
        'tempo': {
            type: "SCALE",
            id: 'tempo',
            name: 'Tempo'
        },
        'comprimento-cm': {
            type: 'UNIT',
            id: 'comprimento-cm',
            name: 'centimetros',
            abbreviation: 'cm'
        },
        'comprimento-m': {
            type: 'UNIT',
            id: 'comprimento-m',
            name: 'metros',
            abbreviation: 'm'
        },
        'comprimento-km': {
            type: 'UNIT',
            id: 'comprimento-km',
            name: 'kilometros',
            abbreviation: 'km'
        },
        'comprimento': {
            type: 'SCALE',
            id: 'comprimento',
            name: 'comprimento'
        },
        'monetaria-brl': {
            type: 'UNIT',
            id: 'monetaria-brl',
            name: 'Reais',
            abbreviation: 'R$'
        },
        'monetaria-usd': {
            type: 'UNIT',
            id: 'monetaria-usd',
            name: 'Dolares',
            abbreviation: '$'
        },
        'monetaria': {
            type: 'SCALE',
            id: 'monetaria',
            name: 'Monetaria'
        }
    },
    edges: {

    },
    adjacencyList: {},
    searchResults: {}
}

export default graph