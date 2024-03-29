import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IGraphModule } from "@kernel/modules/Graphs";

import UnitPanel from "./UnitPanel";
import CompositePanel from "./CompositePanel";
import { CONVERSION_GRAPH_NAME } from "../../../constants";
import useConverterManager from '../../../hooks/useConverterManager';
import { ConversionGraph, ConversionNodes } from "../../../typings";
import ScalePanel from "./ScalePanel";

export const DetailsPanel = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");

  const { DetailsPanel } = layoutModule.components;
  const { useGraph } = graphModule.hooks;

  const manager = useConverterManager((s) => s.selectedNode);
  const selectedNode = useGraph<ConversionGraph, ConversionNodes | undefined>(
    CONVERSION_GRAPH_NAME,
    (g) => manager.state ? g?.nodes[manager.state] as ConversionNodes : undefined
  );

  if (!selectedNode.state) return <></> // TODO: handle error

  return (
    <DetailsPanel>
      <>
      {selectedNode?.state?.type === 'UNIT' && <UnitPanel />}
      {selectedNode?.state?.type === 'SCALE' && <ScalePanel />}
      {selectedNode?.state?.type === 'COMPOUND_UNIT' && <CompositePanel />}
      </>
    </DetailsPanel>
  );
};

export default DetailsPanel;
