import { Scale, Unit } from "../typings"

export interface ConverterState {
    scales: {
        [name: string]: Scale
    }
}

export const initialState: ConverterState = {
    scales: {
        time: {
            name: 'time',
            base: 'm',
            factors: {
                s: 1/60, // seconds
                m: 1, // minutes
                h: 60, // hours
                d: 1440, // days
            }
        },
        length: {
            name: 'length',
            base: 'meters',
            factors: {
                cm: 0.001, // centimeters
                m: 1, // meters
                km: 1000 // kilometers
            }
        },
        area: {
            name: 'area',
            base: 'm2',
            factors: {
                cm2: 10000, // square centimeters
                m2: 1, // square meters
                
            }
        },
        volume: {
            name: 'volume',
            base: 'l',
            factors: {
                ml: 1000, // mililitre
                l: 1 // litre
            }
        }
    },
}