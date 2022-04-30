import React from "react";

import AccordionSection from "@kernel/layout/components/Sidepanels/components/AccordionSection";

import { useAppSelector } from "@kernel/store/hooks";
import CompositionTree from "./CompositionTree";
import MannequinControls from "./MannequinSection";
import { MannequinLayer } from "../../../interfaces/Mannequin";

export interface ComposerLeftPanelContentProps {
  compositionGraphId: string;
  rootId?: string;
}

const ComposerLeftPanelContent = ({
  compositionGraphId,
  rootId = "root",
}: ComposerLeftPanelContentProps) => {
  const {
    mannequinLayer,
  }: {
    mannequinLayer: MannequinLayer;
  } = useAppSelector(
    (state) => state.graphsManager.graphs[compositionGraphId].nodes
  );

  return (
    <>
      <AccordionSection title="Árvore de composição">
        <CompositionTree graphId={compositionGraphId} rootId={rootId} />
      </AccordionSection>
      {mannequinLayer && (
        <AccordionSection title="Maneco">
          <MannequinControls graphId={compositionGraphId} />
        </AccordionSection>
      )}
    </>
  );
};

ComposerLeftPanelContent.defaultProps = {
  rootId: "root",
};

export default ComposerLeftPanelContent;
