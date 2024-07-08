import ListSharpIcon from "@mui/icons-material/ListSharp";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import React, { useCallback } from "react";

import { Store } from "@kernel/modules/Store";

import MaterialsList from "./MaterialSection/MaterialsList";
import ProcessesList from "./ProcessesSection/ProcessesList";
import type {
  CompositionState,
  GarmentNode,
} from "../../store/composition/state";
import useComposition from "../../hooks/useComposition";
import { IGraphModule } from "@kernel/modules/Graphs";
import { CompositionGraph, PartNode } from "../../store/composition/state";
import GarmentPanel from "./GarmentPanel";
import { CompositionInfo } from "../../interfaces";

const ComposerDetailLoader = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const selector = useCallback(
    (c: CompositionState | undefined) => ({
      name: c?.name,
      graphId: c?.graphId,
      selectedPart: c?.selectedPart,
    }),
    []
  );
  const composition = useComposition(
    { viewportName: activeViewport! },
    selector
  );

  if (
    !composition.state?.selectedPart ||
    !composition.state?.graphId ||
    !composition.state?.name
  )return null;
  return (
    <ComposerDetailsPanel
      graphId={composition.state.graphId}
      selectedPart={composition.state.selectedPart}
      compositionName={composition.state.name}
    />
  );
};

const ComposerDetailsPanel = ({
  graphId,
  selectedPart,
  compositionName,
}: CompositionInfo) => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");

  const { DetailsPanel, Accordion } = layoutModule.components;
  const { useGraph } = graphModule.hooks;

  const node = useGraph<CompositionGraph, PartNode | GarmentNode | undefined>(
    graphId,
    (g) => g?.nodes[selectedPart] as PartNode
  );

  if (node.state?.type === "GARMENT")
    return (
      <GarmentPanel
        node={node.state}
        graphId={graphId}
        compositionName={compositionName}
        selectedPart={selectedPart}
      />
    );

  return (
    <DetailsPanel title={node.state?.label ?? selectedPart}>
      <Accordion
        name="Opcionais"
        icon={<ListSharpIcon />}
        summary="Lista de opcionais"
        sx={{ flexGrow: 1 }}
      >
        <></>
      </Accordion>
      <Accordion
        name="Materiais"
        icon={<ListSharpIcon />}
        summary="Lista de materiais"
        sx={{ flexGrow: 1 }}
      >
        <MaterialsList
          graphId={graphId}
          selectedPart={selectedPart}
          compositionName={compositionName}
        />
      </Accordion>
      <Accordion
        name="Processos"
        icon={<ListSharpIcon />}
        summary="Lista de processos"
        sx={{ flexGrow: 1 }}
      >
        <ProcessesList
          graphId={graphId}
          selectedPart={selectedPart}
          compositionName={compositionName}
        />
      </Accordion>
    </DetailsPanel>
  );
};

export default React.memo(ComposerDetailLoader);
