import { useCallback } from "react";

import useModule from "@kernel/hooks/useModule";

import { IMaterialsModule } from "@system/modules/Materials";

import { MaterialUsageNode } from "../../store/composition/state";
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

  const composition = useComposition(graphId, (c) => c); // QUESTION: what if graphId != composition name?

  const handleMaterialChange = useCallback(
    (materialId: number) => composition.actions.changeMaterial(node.id, materialId),
    [graphId, node.id]
  );

  return (
    <MaterialSelector
      type={node.materialType}
      value={1}
      onChange={handleMaterialChange}
    />
  );
};

export default MaterialSelector;
