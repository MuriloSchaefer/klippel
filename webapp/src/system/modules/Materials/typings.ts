// FIBERS TYPINGS
export type VegetalFibers    = 'Abaca'  | 'Algodao'  | 'Juta'    | 'Linho'   | 'Rami'
export type VegetalFibersABV = 'CB'     | 'CO'       | 'CJ'      | 'CL'      | 'CR'

export type AnimalFibers    = 'La'  | 'Seda'
export type AnimalFibersABV = 'WO'  | 'SK'

export type MineralFibers    = 'Amianto'
export type MineralFibersABV = 'A'

export type NaturalFibers = VegetalFibers | AnimalFibers | MineralFibers
export type NaturalFibersABV = VegetalFibersABV | AnimalFibersABV | MineralFibersABV

export type ArtificialFibers    = 'Acetato' | 'Liocel'  | 'Modal'   | 'Viscose'
export type ArtificialFibersABV = 'CA'      | 'CLY'     | 'CMO'     | 'CV'

export type SinteticFibers     = 'Acrilico' | 'Elastano'    | 'Poliester'   | 'Poliamida'   | 'Polipropileno'   | 'Poliuretano Elastomerico' | 'Polietileno'
export type SinteticFibersABV  = 'PAC'      | 'PUE'         | 'PES'         | 'PA'          | 'PP'              | 'PUR'                      | 'PET'

export type NonNaturalFibers = ArtificialFibers | SinteticFibers
export type NonNaturalFibersABV = ArtificialFibersABV | SinteticFibersABV

export type FibersName = NaturalFibers | NonNaturalFibers
export type FibersABV = NaturalFibersABV | NonNaturalFibersABV


export interface Color {
    id: string
    hex: string
    label?: string
}