
export type Model = {
    id: string,
    name: string,
    svg?: string,
    graph: string,
    graphId?: string, // loaded graph id
    description?: string
}

export type ModelVariation = Model & {
  variationId: string 
  instanceId: string // in memory id, used for graphId, svgId. Overwriten when loading from disk
  selectedPart?: string
}

export type ComposerModuleState = {
    models: {[id: string]: Model},
    variations: {[id:string]: ModelVariation}
}

