import { GraphState } from "@kernel/modules/Graphs/store/state";
import { ConversionNodes, ConvertionEdges } from "../typings";

const graph: GraphState<ConversionNodes, ConvertionEdges> = {
  id: "conversion-graph",
  nodes: {
    metros5: {
      type: 'UNIT',
      id: 'metros5',
      name: 'metros',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'm'
    },
    comprimento6: {
      type: 'SCALE',
      id: 'comprimento6',
      name: 'Comprimento',
      position: {
        x: 0,
        y: 0
      }
    },
    centimetros7: {
      type: 'UNIT',
      id: 'centimetros7',
      name: 'centimetros',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'cm'
    },
    kilometros8: {
      type: 'UNIT',
      id: 'kilometros8',
      name: 'kilometros',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'km'
    },
    milimetros9: {
      type: 'UNIT',
      id: 'milimetros9',
      name: 'milimetros',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'mm'
    },
    monetaria10: {
      type: 'SCALE',
      id: 'monetaria10',
      name: 'Monetaria',
      position: {
        x: 0,
        y: 0
      }
    },
    reais11: {
      type: 'UNIT',
      id: 'reais11',
      name: 'reais',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'R$'
    },
    dolares12: {
      type: 'UNIT',
      id: 'dolares12',
      name: 'dolares',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: '$'
    },
    volume13: {
      type: 'SCALE',
      id: 'volume13',
      name: 'Volume',
      position: {
        x: 0,
        y: 0
      }
    },
    litroscubicos14: {
      type: 'UNIT',
      id: 'litroscubicos14',
      name: 'litros cubicos',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'l³'
    },
    metroscubicos15: {
      type: 'UNIT',
      id: 'metroscubicos15',
      name: 'metros cubicos',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'm³'
    },
    area16: {
      type: 'SCALE',
      id: 'area16',
      name: 'Area',
      position: {
        x: 0,
        y: 0
      }
    },
    metrosquadrados17: {
      type: 'UNIT',
      id: 'metrosquadrados17',
      name: 'metros quadrados',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'm²'
    },
    unitario18: {
      type: 'UNIT',
      id: 'unitario18',
      name: 'unitario',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'un'
    },
    capacidade5: {
      type: 'SCALE',
      id: 'capacidade5',
      name: 'Capacidade',
      position: {
        x: 0,
        y: 0
      }
    },
    mililitros6: {
      type: 'UNIT',
      id: 'mililitros6',
      name: 'mililitros',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'ml'
    },
    litros7: {
      type: 'UNIT',
      id: 'litros7',
      name: 'litros',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'l'
    },
    kilometrosquadrados8: {
      type: 'UNIT',
      id: 'kilometrosquadrados8',
      name: 'kilometros quadrados',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'km²'
    },
    centimetrosquadrados9: {
      type: 'UNIT',
      id: 'centimetrosquadrados9',
      name: 'centimetros quadrados',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'cm²'
    },
    temporal247: {
      type: 'SCALE',
      id: 'temporal247',
      name: 'Temporal',
      position: {
        x: 0,
        y: 0
      }
    },
    segundos248: {
      type: 'UNIT',
      id: 'segundos248',
      name: 'segundos',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 's'
    },
    minutos249: {
      type: 'UNIT',
      id: 'minutos249',
      name: 'minutos',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'm'
    },
    hora250: {
      type: 'UNIT',
      id: 'hora250',
      name: 'hora',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'h'
    },
    dia251: {
      type: 'UNIT',
      id: 'dia251',
      name: 'dia',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'd'
    },
    mes252: {
      type: 'UNIT',
      id: 'mes252',
      name: 'mes',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'm'
    },
    semana253: {
      type: 'UNIT',
      id: 'semana253',
      name: 'semana',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'sem'
    }
  },
  edges: {
    'metros5 -> comprimento6': {
      id: 'metros5 -> comprimento6',
      type: 'BELONGS_TO',
      sourceId: 'metros5',
      targetId: 'comprimento6'
    },
    'centimetros7 -> comprimento6': {
      id: 'centimetros7 -> comprimento6',
      type: 'BELONGS_TO',
      sourceId: 'centimetros7',
      targetId: 'comprimento6'
    },
    'kilometros8 -> comprimento6': {
      id: 'kilometros8 -> comprimento6',
      type: 'BELONGS_TO',
      sourceId: 'kilometros8',
      targetId: 'comprimento6'
    },
    'milimetros9 -> comprimento6': {
      id: 'milimetros9 -> comprimento6',
      type: 'BELONGS_TO',
      sourceId: 'milimetros9',
      targetId: 'comprimento6'
    },
    'reais11 -> monetaria10': {
      id: 'reais11 -> monetaria10',
      type: 'BELONGS_TO',
      sourceId: 'reais11',
      targetId: 'monetaria10'
    },
    'dolares12 -> monetaria10': {
      id: 'dolares12 -> monetaria10',
      type: 'BELONGS_TO',
      sourceId: 'dolares12',
      targetId: 'monetaria10'
    },
    'litroscubicos14 -> volume13': {
      id: 'litroscubicos14 -> volume13',
      type: 'BELONGS_TO',
      sourceId: 'litroscubicos14',
      targetId: 'volume13'
    },
    'metroscubicos15 -> volume13': {
      id: 'metroscubicos15 -> volume13',
      type: 'BELONGS_TO',
      sourceId: 'metroscubicos15',
      targetId: 'volume13'
    },
    'metrosquadrados17 -> area16': {
      id: 'metrosquadrados17 -> area16',
      type: 'BELONGS_TO',
      sourceId: 'metrosquadrados17',
      targetId: 'area16'
    },
    'mililitros6 -> volume13': {
      id: 'mililitros6 -> volume13',
      type: 'BELONGS_TO',
      sourceId: 'mililitros6',
      targetId: 'volume13'
    },
    'litros7 -> volume13': {
      id: 'litros7 -> volume13',
      type: 'BELONGS_TO',
      sourceId: 'litros7',
      targetId: 'volume13'
    },
    'kilometrosquadrados8 -> area16': {
      id: 'kilometrosquadrados8 -> area16',
      type: 'BELONGS_TO',
      sourceId: 'kilometrosquadrados8',
      targetId: 'area16'
    },
    'centimetrosquadrados9 -> area16': {
      id: 'centimetrosquadrados9 -> area16',
      type: 'BELONGS_TO',
      sourceId: 'centimetrosquadrados9',
      targetId: 'area16'
    },
    'segundos248 -> temporal247': {
      id: 'segundos248 -> temporal247',
      type: 'BELONGS_TO',
      sourceId: 'segundos248',
      targetId: 'temporal247'
    },
    'minutos249 -> temporal247': {
      id: 'minutos249 -> temporal247',
      type: 'BELONGS_TO',
      sourceId: 'minutos249',
      targetId: 'temporal247'
    },
    'hora250 -> temporal247': {
      id: 'hora250 -> temporal247',
      type: 'BELONGS_TO',
      sourceId: 'hora250',
      targetId: 'temporal247'
    },
    'dia251 -> temporal247': {
      id: 'dia251 -> temporal247',
      type: 'BELONGS_TO',
      sourceId: 'dia251',
      targetId: 'temporal247'
    },
    'mes252 -> temporal247': {
      id: 'mes252 -> temporal247',
      type: 'BELONGS_TO',
      sourceId: 'mes252',
      targetId: 'temporal247'
    },
    'semana253 -> temporal247': {
      id: 'semana253 -> temporal247',
      type: 'BELONGS_TO',
      sourceId: 'semana253',
      targetId: 'temporal247'
    }
  },
  adjacencyList: {
    metros5: {
      inputs: [],
      outputs: [
        'metros5 -> comprimento6'
      ]
    },
    comprimento6: {
      inputs: [
        'metros5 -> comprimento6',
        'centimetros7 -> comprimento6',
        'kilometros8 -> comprimento6',
        'milimetros9 -> comprimento6'
      ],
      outputs: []
    },
    centimetros7: {
      inputs: [],
      outputs: [
        'centimetros7 -> comprimento6'
      ]
    },
    kilometros8: {
      inputs: [],
      outputs: [
        'kilometros8 -> comprimento6'
      ]
    },
    milimetros9: {
      inputs: [],
      outputs: [
        'milimetros9 -> comprimento6'
      ]
    },
    monetaria10: {
      inputs: [
        'reais11 -> monetaria10',
        'dolares12 -> monetaria10'
      ],
      outputs: []
    },
    reais11: {
      inputs: [],
      outputs: [
        'reais11 -> monetaria10'
      ]
    },
    dolares12: {
      inputs: [],
      outputs: [
        'dolares12 -> monetaria10'
      ]
    },
    volume13: {
      inputs: [
        'litroscubicos14 -> volume13',
        'metroscubicos15 -> volume13',
        'mililitros6 -> volume13',
        'litros7 -> volume13'
      ],
      outputs: []
    },
    litroscubicos14: {
      inputs: [],
      outputs: [
        'litroscubicos14 -> volume13'
      ]
    },
    metroscubicos15: {
      inputs: [],
      outputs: [
        'metroscubicos15 -> volume13'
      ]
    },
    area16: {
      inputs: [
        'metrosquadrados17 -> area16',
        'kilometrosquadrados8 -> area16',
        'centimetrosquadrados9 -> area16'
      ],
      outputs: []
    },
    metrosquadrados17: {
      inputs: [],
      outputs: [
        'metrosquadrados17 -> area16'
      ]
    },
    unitario18: {
      inputs: [],
      outputs: []
    },
    capacidade5: {
      inputs: [],
      outputs: []
    },
    mililitros6: {
      inputs: [],
      outputs: [
        'mililitros6 -> volume13'
      ]
    },
    litros7: {
      inputs: [],
      outputs: [
        'litros7 -> volume13'
      ]
    },
    kilometrosquadrados8: {
      inputs: [],
      outputs: [
        'kilometrosquadrados8 -> area16'
      ]
    },
    centimetrosquadrados9: {
      inputs: [],
      outputs: [
        'centimetrosquadrados9 -> area16'
      ]
    },
    temporal247: {
      inputs: [
        'segundos248 -> temporal247',
        'minutos249 -> temporal247',
        'hora250 -> temporal247',
        'dia251 -> temporal247',
        'mes252 -> temporal247',
        'semana253 -> temporal247'
      ],
      outputs: []
    },
    segundos248: {
      inputs: [],
      outputs: [
        'segundos248 -> temporal247'
      ]
    },
    minutos249: {
      inputs: [],
      outputs: [
        'minutos249 -> temporal247'
      ]
    },
    hora250: {
      inputs: [],
      outputs: [
        'hora250 -> temporal247'
      ]
    },
    dia251: {
      inputs: [],
      outputs: [
        'dia251 -> temporal247'
      ]
    },
    mes252: {
      inputs: [],
      outputs: [
        'mes252 -> temporal247'
      ]
    },
    semana253: {
      inputs: [],
      outputs: [
        'semana253 -> temporal247'
      ]
    }
  },
  searchResults: {},
};

export default graph;
