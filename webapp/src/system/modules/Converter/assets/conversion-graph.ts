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
      abbreviation: 'seg'
    },
    minutos249: {
      type: 'UNIT',
      id: 'minutos249',
      name: 'minutos',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'min'
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
      abbreviation: 'mes'
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
    },
    peso5: {
      type: 'SCALE',
      id: 'peso5',
      name: 'Peso',
      position: {
        x: 0,
        y: 0
      }
    },
    kilogramas6: {
      type: 'UNIT',
      id: 'kilogramas6',
      name: 'Kilogramas',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'Kg'
    },
    gramas7: {
      type: 'UNIT',
      id: 'gramas7',
      name: 'gramas',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'g'
    },
    miligramas8: {
      type: 'UNIT',
      id: 'miligramas8',
      name: 'miligramas',
      position: {
        x: 0,
        y: 0
      },
      abbreviation: 'mg'
    },
    'un / min': {
      id: 'un / min',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'unitario18',
      dividendUnitId: 'minutos249',
      abbreviation: 'un / min',
      name: 'unitario per minutos'
    },
    'R$ / h': {
      id: 'R$ / h',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'reais11',
      dividendUnitId: 'hora250',
      abbreviation: 'R$ / h',
      name: 'reais per hora'
    },
    'R$ / un': {
      id: 'R$ / un',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'reais11',
      dividendUnitId: 'unitario18',
      abbreviation: 'R$ / un',
      name: 'reais per unitario'
    },
    'un / h': {
      id: 'un / h',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'unitario18',
      dividendUnitId: 'hora250',
      abbreviation: 'un / h',
      name: 'unitario per hora'
    },
    'm² / Kg': {
      id: 'm² / Kg',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'metrosquadrados17',
      dividendUnitId: 'kilogramas6',
      abbreviation: 'm² / Kg',
      name: 'metros quadrados per Kilogramas'
    },
    'm² / un': {
      id: 'm² / un',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'metrosquadrados17',
      dividendUnitId: 'unitario18',
      abbreviation: 'm² / un',
      name: 'metros quadrados per unitario'
    },
    'm / un': {
      id: 'm / un',
      type: 'COMPOUND_UNIT',
      position: {
        x: 0,
        y: 0
      },
      quotientUnitId: 'metros5',
      dividendUnitId: 'unitario18',
      abbreviation: 'm / un',
      name: 'metros per unitario'
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
    },
    'kilogramas6 -> peso5': {
      id: 'kilogramas6 -> peso5',
      type: 'BELONGS_TO',
      sourceId: 'kilogramas6',
      targetId: 'peso5'
    },
    'gramas7 -> peso5': {
      id: 'gramas7 -> peso5',
      type: 'BELONGS_TO',
      sourceId: 'gramas7',
      targetId: 'peso5'
    },
    'miligramas8 -> peso5': {
      id: 'miligramas8 -> peso5',
      type: 'BELONGS_TO',
      sourceId: 'miligramas8',
      targetId: 'peso5'
    },
    'un / min->unitario18': {
      id: 'un / min->unitario18',
      type: 'QUOTIENT',
      sourceId: 'un / min',
      targetId: 'unitario18'
    },
    'un / min->minutos249': {
      id: 'un / min->minutos249',
      type: 'DIVIDEND',
      sourceId: 'un / min',
      targetId: 'minutos249'
    },
    'R$ / h->reais11': {
      id: 'R$ / h->reais11',
      type: 'QUOTIENT',
      sourceId: 'R$ / h',
      targetId: 'reais11'
    },
    'R$ / h->hora250': {
      id: 'R$ / h->hora250',
      type: 'DIVIDEND',
      sourceId: 'R$ / h',
      targetId: 'hora250'
    },
    'R$ / un->reais11': {
      id: 'R$ / un->reais11',
      type: 'QUOTIENT',
      sourceId: 'R$ / un',
      targetId: 'reais11'
    },
    'R$ / un->unitario18': {
      id: 'R$ / un->unitario18',
      type: 'DIVIDEND',
      sourceId: 'R$ / un',
      targetId: 'unitario18'
    },
    'un / h->unitario18': {
      id: 'un / h->unitario18',
      type: 'QUOTIENT',
      sourceId: 'un / h',
      targetId: 'unitario18'
    },
    'un / h->hora250': {
      id: 'un / h->hora250',
      type: 'DIVIDEND',
      sourceId: 'un / h',
      targetId: 'hora250'
    },
    'm² / Kg->metrosquadrados17': {
      id: 'm² / Kg->metrosquadrados17',
      type: 'QUOTIENT',
      sourceId: 'm² / Kg',
      targetId: 'metrosquadrados17'
    },
    'm² / Kg->kilogramas6': {
      id: 'm² / Kg->kilogramas6',
      type: 'DIVIDEND',
      sourceId: 'm² / Kg',
      targetId: 'kilogramas6'
    },
    'un / h-[conv]->un / min': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: '(quantidadeQuociente / quantidadeDividendo) / 60',
      id: 'un / h-[conv]->un / min',
      sourceId: 'un / h',
      targetId: 'un / min'
    },
    'un / min-[conv]->un / h': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: '(quantidadeQuociente / quantidadeDividendo) * 60',
      id: 'un / min-[conv]->un / h',
      sourceId: 'un / min',
      targetId: 'un / h'
    },
    'R$ / un-[conv]->reais11': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: '(quantidadeQuociente / quantidadeDividendo) * unidades',
      id: 'R$ / un-[conv]->reais11',
      sourceId: 'R$ / un',
      targetId: 'reais11'
    },
    'semana253-[conv]->dia251': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 7',
      id: 'semana253-[conv]->dia251',
      sourceId: 'semana253',
      targetId: 'dia251'
    },
    'semana253-[conv]->mes252': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade / 4',
      id: 'semana253-[conv]->mes252',
      sourceId: 'semana253',
      targetId: 'mes252'
    },
    'dia251-[conv]->hora250': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade / 24',
      id: 'dia251-[conv]->hora250',
      sourceId: 'dia251',
      targetId: 'hora250'
    },
    'hora250-[conv]->minutos249': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade / 60',
      id: 'hora250-[conv]->minutos249',
      sourceId: 'hora250',
      targetId: 'minutos249'
    },
    'minutos249-[conv]->segundos248': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade / 60',
      id: 'minutos249-[conv]->segundos248',
      sourceId: 'minutos249',
      targetId: 'segundos248'
    },
    'm² / Kg-[conv]->kilogramas6': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: '(quantidadeQuociente / quantidadeDividendo) * metrosQuadrado',
      id: 'm² / Kg-[conv]->kilogramas6',
      sourceId: 'm² / Kg',
      targetId: 'kilogramas6'
    },
    'm² / un->metrosquadrados17': {
      id: 'm² / un->metrosquadrados17',
      type: 'QUOTIENT',
      sourceId: 'm² / un',
      targetId: 'metrosquadrados17'
    },
    'm² / un->unitario18': {
      id: 'm² / un->unitario18',
      type: 'DIVIDEND',
      sourceId: 'm² / un',
      targetId: 'unitario18'
    },
    'm² / un-[conv]->metrosquadrados17': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: '(quantidadeQuociente / quantidadeDividendo) * unidades',
      id: 'm² / un-[conv]->metrosquadrados17',
      sourceId: 'm² / un',
      targetId: 'metrosquadrados17'
    },
    'metrosquadrados17-[conv]->metros5': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'sqrt quantidade',
      id: 'metrosquadrados17-[conv]->metros5',
      sourceId: 'metrosquadrados17',
      targetId: 'metros5'
    },
    'metros5-[conv]->kilogramas6': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * rendimento',
      id: 'metros5-[conv]->kilogramas6',
      sourceId: 'metros5',
      targetId: 'kilogramas6'
    },
    'metrosquadrados17-[conv]->kilometrosquadrados8': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade / 1000',
      id: 'metrosquadrados17-[conv]->kilometrosquadrados8',
      sourceId: 'metrosquadrados17',
      targetId: 'kilometrosquadrados8'
    },
    'kilometrosquadrados8-[conv]->centimetrosquadrados9': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 1000 * 100',
      id: 'kilometrosquadrados8-[conv]->centimetrosquadrados9',
      sourceId: 'kilometrosquadrados8',
      targetId: 'centimetrosquadrados9'
    },
    'metrosquadrados17-[conv]->centimetrosquadrados9': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 100',
      id: 'metrosquadrados17-[conv]->centimetrosquadrados9',
      sourceId: 'metrosquadrados17',
      targetId: 'centimetrosquadrados9'
    },
    'kilometrosquadrados8-[conv]->metrosquadrados17': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 1000',
      id: 'kilometrosquadrados8-[conv]->metrosquadrados17',
      sourceId: 'kilometrosquadrados8',
      targetId: 'metrosquadrados17'
    },
    'metros5-[conv]->centimetros7': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 100',
      id: 'metros5-[conv]->centimetros7',
      sourceId: 'metros5',
      targetId: 'centimetros7'
    },
    'metros5-[conv]->milimetros9': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 1000',
      id: 'metros5-[conv]->milimetros9',
      sourceId: 'metros5',
      targetId: 'milimetros9'
    },
    'kilometros8-[conv]->metros5': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade * 1000',
      id: 'kilometros8-[conv]->metros5',
      sourceId: 'kilometros8',
      targetId: 'metros5'
    },
    'metros5-[conv]->kilometros8': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: 'quantidade / 1000',
      id: 'metros5-[conv]->kilometros8',
      sourceId: 'metros5',
      targetId: 'kilometros8'
    },
    'm / un->metros5': {
      id: 'm / un->metros5',
      type: 'QUOTIENT',
      sourceId: 'm / un',
      targetId: 'metros5'
    },
    'm / un->unitario18': {
      id: 'm / un->unitario18',
      type: 'DIVIDEND',
      sourceId: 'm / un',
      targetId: 'unitario18'
    },
    'm / un-[conv]->metros5': {
      type: 'CONVERTS_TO',
      conversionType: 'expression',
      expression: '(quantidadeQuociente / quantidadeDividendo) * unidades',
      id: 'm / un-[conv]->metros5',
      sourceId: 'm / un',
      targetId: 'metros5'
    }
  },
  adjacencyList: {
    metros5: {
      inputs: [
        'metrosquadrados17-[conv]->metros5',
        'kilometros8-[conv]->metros5',
        'm / un->metros5',
        'm / un-[conv]->metros5'
      ],
      outputs: [
        'metros5 -> comprimento6',
        'metros5-[conv]->kilogramas6',
        'metros5-[conv]->centimetros7',
        'metros5-[conv]->milimetros9',
        'metros5-[conv]->kilometros8'
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
      inputs: [
        'metros5-[conv]->centimetros7'
      ],
      outputs: [
        'centimetros7 -> comprimento6'
      ]
    },
    kilometros8: {
      inputs: [
        'metros5-[conv]->kilometros8'
      ],
      outputs: [
        'kilometros8 -> comprimento6',
        'kilometros8-[conv]->metros5'
      ]
    },
    milimetros9: {
      inputs: [
        'metros5-[conv]->milimetros9'
      ],
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
      inputs: [
        'R$ / h->reais11',
        'R$ / un->reais11',
        'R$ / un-[conv]->reais11'
      ],
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
      inputs: [
        'm² / Kg->metrosquadrados17',
        'm² / un->metrosquadrados17',
        'm² / un-[conv]->metrosquadrados17',
        'kilometrosquadrados8-[conv]->metrosquadrados17'
      ],
      outputs: [
        'metrosquadrados17 -> area16',
        'metrosquadrados17-[conv]->metros5',
        'metrosquadrados17-[conv]->kilometrosquadrados8',
        'metrosquadrados17-[conv]->centimetrosquadrados9'
      ]
    },
    unitario18: {
      inputs: [
        'un / min->unitario18',
        'R$ / un->unitario18',
        'un / h->unitario18',
        'm² / un->unitario18',
        'm / un->unitario18'
      ],
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
      inputs: [
        'metrosquadrados17-[conv]->kilometrosquadrados8'
      ],
      outputs: [
        'kilometrosquadrados8 -> area16',
        'kilometrosquadrados8-[conv]->centimetrosquadrados9',
        'kilometrosquadrados8-[conv]->metrosquadrados17'
      ]
    },
    centimetrosquadrados9: {
      inputs: [
        'kilometrosquadrados8-[conv]->centimetrosquadrados9',
        'metrosquadrados17-[conv]->centimetrosquadrados9'
      ],
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
      inputs: [
        'minutos249-[conv]->segundos248'
      ],
      outputs: [
        'segundos248 -> temporal247'
      ]
    },
    minutos249: {
      inputs: [
        'un / min->minutos249',
        'hora250-[conv]->minutos249'
      ],
      outputs: [
        'minutos249 -> temporal247',
        'minutos249-[conv]->segundos248'
      ]
    },
    hora250: {
      inputs: [
        'R$ / h->hora250',
        'un / h->hora250',
        'dia251-[conv]->hora250'
      ],
      outputs: [
        'hora250 -> temporal247',
        'hora250-[conv]->minutos249'
      ]
    },
    dia251: {
      inputs: [
        'semana253-[conv]->dia251'
      ],
      outputs: [
        'dia251 -> temporal247',
        'dia251-[conv]->hora250'
      ]
    },
    mes252: {
      inputs: [
        'semana253-[conv]->mes252'
      ],
      outputs: [
        'mes252 -> temporal247'
      ]
    },
    semana253: {
      inputs: [],
      outputs: [
        'semana253 -> temporal247',
        'semana253-[conv]->dia251',
        'semana253-[conv]->mes252'
      ]
    },
    peso5: {
      inputs: [
        'kilogramas6 -> peso5',
        'gramas7 -> peso5',
        'miligramas8 -> peso5'
      ],
      outputs: []
    },
    kilogramas6: {
      inputs: [
        'm² / Kg->kilogramas6',
        'm² / Kg-[conv]->kilogramas6',
        'metros5-[conv]->kilogramas6'
      ],
      outputs: [
        'kilogramas6 -> peso5'
      ]
    },
    gramas7: {
      inputs: [],
      outputs: [
        'gramas7 -> peso5'
      ]
    },
    miligramas8: {
      inputs: [],
      outputs: [
        'miligramas8 -> peso5'
      ]
    },
    'un / min': {
      inputs: [
        'un / h-[conv]->un / min'
      ],
      outputs: [
        'un / min->unitario18',
        'un / min->minutos249',
        'un / min-[conv]->un / h'
      ]
    },
    'R$ / h': {
      inputs: [],
      outputs: [
        'R$ / h->reais11',
        'R$ / h->hora250'
      ]
    },
    'R$ / un': {
      inputs: [],
      outputs: [
        'R$ / un->reais11',
        'R$ / un->unitario18',
        'R$ / un-[conv]->reais11'
      ]
    },
    'un / h': {
      inputs: [
        'un / min-[conv]->un / h'
      ],
      outputs: [
        'un / h->unitario18',
        'un / h->hora250',
        'un / h-[conv]->un / min'
      ]
    },
    'm² / Kg': {
      inputs: [],
      outputs: [
        'm² / Kg->metrosquadrados17',
        'm² / Kg->kilogramas6',
        'm² / Kg-[conv]->kilogramas6'
      ]
    },
    'm² / un': {
      inputs: [],
      outputs: [
        'm² / un->metrosquadrados17',
        'm² / un->unitario18',
        'm² / un-[conv]->metrosquadrados17'
      ]
    },
    'm / un': {
      inputs: [],
      outputs: [
        'm / un->metros5',
        'm / un->unitario18',
        'm / un-[conv]->metros5'
      ]
    }
  },
  searchResults: {},
};

export default graph;
