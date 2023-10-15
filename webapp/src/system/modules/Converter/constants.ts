export const MODULE_NAME = "Converter";
export const MODULE_VERSION = "0.0.1";

export const CONVERSION_GRAPH_NAME = "conversion-graph"

export const TIME_SCALE = {
    week: 'Semana',
    day: 'Dia',
    h: 'H',
    m: 'm',
    s: 's',
    ms: 'ms'
}

export type TimeScale = keyof typeof TIME_SCALE

export const MONEY_SCALE = {}