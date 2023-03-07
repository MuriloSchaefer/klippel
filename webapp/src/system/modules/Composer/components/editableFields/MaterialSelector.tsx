import { FormControl, InputLabel, Select } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { IMaterialsModule } from "@system/modules/Materials";
import { CompositionEdge, MaterialUsageNode } from "../../store/graph/state";
import { useCallback } from "react";
import useComposition from "../../hooks/useComposition";
import { Store } from "@kernel/modules/Store";
import { selectCompositionStateByGraphId } from "../../store/selectors";

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
