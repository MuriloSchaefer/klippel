import { useCallback } from "react";

import useModule from "@kernel/hooks/useModule";

import { IGraphModule } from "@kernel/modules/Graphs";
import type { IMaterialsModule } from "@system/modules/Materials";

import { CompositionGraph, MaterialNode, MaterialUsageNode } from "../../store/composition/state";
import useComposition from "../../hooks/useComposition";

const MaterialSelector = ({
  graphId,
  node,
}: {
  graphId: string;
  node: MaterialUsageNode;
}) => {
  const {
    components: { MaterialSelector },
  } = useModule<IMaterialsModule>("Materials");
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;

  const composition = useComposition(graphId, (c) => c); // QUESTION: what if graphId != composition name?

  const materialInfo = useGraph<CompositionGraph, MaterialNode|undefined>(
    graphId,
    (g) => g?.nodes[node.materialId] as MaterialNode
  );

  const handleMaterialChange = useCallback(
    (materialId: number) => composition.actions.changeMaterial(node.id, materialId),
    [graphId, node.id]
  );

  return (
    <MaterialSelector
      type={node.materialType}
      value={materialInfo?.state?.materialId}
      onChange={handleMaterialChange}
    />
  );
};

export default MaterialSelector;
