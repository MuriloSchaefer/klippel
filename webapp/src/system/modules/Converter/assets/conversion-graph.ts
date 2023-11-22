import { GraphState } from "@kernel/modules/Graphs/store/state";
import { ConversionNodes, ConvertionEdges } from "../typings";

const graph: GraphState<ConversionNodes, ConvertionEdges> = {
  id: "conversion-graph",
  nodes: {
    "tempo-s": {
      type: "UNIT",
      id: "tempo-s",
      name: "segundos",
      abbreviation: "s",
      position: {x: 0, y: 0}
    },
    "tempo-m": {
      type: "UNIT",
      id: "tempo-m",
      name: "minutos",
      abbreviation: "m",
      position: {x: 0, y: 0}
    },
    "tempo-h": {
      type: "UNIT",
      id: "tempo-h",
      name: "horas",
      abbreviation: "h",
      position: {x: 0, y: 0}
    },
    "tempo-d": {
      type: "UNIT",
      id: "tempo-d",
      name: "dias",
      abbreviation: "d",
      position: {x: 0, y: 0}
    },
    "tempo-sem": {
      type: "UNIT",
      id: "tempo-sem",
      name: "semanas",
      abbreviation: "sem",
      position: {x: 0, y: 0}
    },
    tempo: {
      type: "SCALE",
      id: "tempo",
      name: "Tempo",
      position: {x: 0, y: 0}
    },
    "comprimento-cm": {
      type: "UNIT",
      id: "comprimento-cm",
      name: "centimetros",
      abbreviation: "cm",
      position: {x: 0, y: 0}
    },
    "comprimento-m": {
      type: "UNIT",
      id: "comprimento-m",
      name: "metros",
      abbreviation: "m",
      position: {x: 0, y: 0}
    },
    "comprimento-km": {
      type: "UNIT",
      id: "comprimento-km",
      name: "kilometros",
      abbreviation: "km",
      position: {x: 0, y: 0}
    },
    comprimento: {
      type: "SCALE",
      id: "comprimento",
      name: "comprimento",
      position: {x: 0, y: 0}
    },
    "monetaria-brl": {
      type: "UNIT",
      id: "monetaria-brl",
      name: "Reais",
      abbreviation: "R$",
      position: {x: 0, y: 0}
    },
    "monetaria-usd": {
      type: "UNIT",
      id: "monetaria-usd",
      name: "Dolares",
      abbreviation: "$",
      position: {x: 0, y: 0}
    },
    monetaria: {
      type: "SCALE",
      id: "monetaria",
      name: "Monetaria",
      position: {x: 0, y: 0}
    },
    area: {
      type: 'SCALE',
      name: 'Area',
      id: 'area',
      position: {x:0, y:0}
    },
    "area-cm2": {
      type: "UNIT",
      id: "area-cm2",
      name: "centimetro quadrado",
      abbreviation: "cm²",
      position: {x: 0, y: 0}
    },
    "area-m2": {
      type: "UNIT",
      id: "area-m2",
      name: "metro quadrado",
      abbreviation: "m²",
      position: {x: 0, y: 0}
    },
  },
  edges: {
    "tempo-s -> tempo-m": {
      type: "CONVERTS_TO",
      conversionType: 'division',
      id: "tempo-s -> tempo-m",
      factor: 60,
      sourceId: 'tempo-s',
      targetId: 'tempo-m'
    },
    "tempo-m -> tempo-h": {
      type: "CONVERTS_TO",
      id: "tempo-m -> tempo-h",
      conversionType: 'division',
      factor: 60,
      sourceId: 'tempo-m',
      targetId: 'tempo-h'
    },
    "tempo-h -> tempo-d": {
      type: "CONVERTS_TO",
      conversionType: 'division',
      id: "tempo-h -> tempo-d",
      factor: 24,
      sourceId: 'tempo-h',
      targetId: 'tempo-d'
    },
    "tempo-d -> tempo-sem": {
      type: "CONVERTS_TO",
      conversionType: 'division',
      id: "tempo-d -> tempo-sem",
      factor: 7,
      sourceId: 'tempo-d',
      targetId: 'tempo-sem'
    },

    "tempo-s -> tempo": {
      type: 'BELONGS_TO',
      id: "tempo-s -> tempo",
      sourceId: 'tempo-s',
      targetId: 'tempo'
    },
    "tempo-m -> tempo": {
      type: 'BELONGS_TO',
      id: "tempo-m -> tempo",
      sourceId: 'tempo-m',
      targetId: 'tempo'
    },
    "tempo-h -> tempo": {
      type: 'BELONGS_TO',
      id: "tempo-h -> tempo",
      sourceId: 'tempo-h',
      targetId: 'tempo'
    },
    "tempo-d -> tempo": {
      type: 'BELONGS_TO',
      id: "tempo-d -> tempo",
      sourceId: 'tempo-d',
      targetId: 'tempo'
    },
    "tempo-sem -> tempo": {
      type: 'BELONGS_TO',
      id: "tempo-sem -> tempo",
      sourceId: 'tempo-sem',
      targetId: 'tempo'
    },
    "monetaria-usd -> monetaria": {
      type: 'BELONGS_TO',
      id: "monetaria-usd -> monetaria",
      sourceId: 'monetaria-usd',
      targetId: 'monetaria'
    },
    "monetaria-brl -> monetaria": {
      type: 'BELONGS_TO',
      id: "monetaria-brl -> monetaria",
      sourceId: 'monetaria-brl',
      targetId: 'monetaria'
    },
    "monetaria-usd -> monetaria-brl": {
      type: 'CONVERTS_TO',
      conversionType: 'parametrized',
      params: {
        rate: 'number', // QUESTION: is it possible to use zod to ensure params at runtime?
      },
      expression: 'in * rate',
      id: "monetaria-usd -> monetaria-brl",
      sourceId: 'monetaria-usd',
      targetId: 'monetaria-brl'
    },
    "monetaria-brl -> monetaria-usd": {
      type: 'CONVERTS_TO',
      conversionType: 'parametrized',
      params: {
        rate: 'number', // QUESTION: is it possible to use zod to ensure params at runtime?
      },
      expression: 'in * rate',
      id: "monetaria-brl -> monetaria-usd",
      sourceId: 'monetaria-brl',
      targetId: 'monetaria-usd'
    }
  },
  adjacencyList: {},
  searchResults: {},
};

export default graph;
