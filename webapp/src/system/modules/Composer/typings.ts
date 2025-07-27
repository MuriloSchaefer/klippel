
import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";

import type { CompoundValue, UnitValue } from "@system/modules/Converter/typings";

export type Model = {
    id: string,
    name: string,
    svg?: string,
    graph: string,
    description: string
}

export type ModelVariation = Model & {
  variationId: string 
  instanceId: string // in memory id, used for graphId, svgId. Overwriten when loading from disk
}

export type ComposerModuleState = {
    models: Map<string, Model>,
    variations: Map<string, ModelVariation>
}

