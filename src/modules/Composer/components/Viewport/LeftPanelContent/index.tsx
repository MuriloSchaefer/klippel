import React, { useEffect } from "react";
import { isEmpty } from "lodash";

import AccordionSection from "@kernel/layout/components/Sidepanels/components/AccordionSection";

import { useComposerUIState } from "modules/Composer/hooks/useComposerUIState";
import useGraph from "@kernel/hooks/useGraph";
import { useAppDispatch } from "@kernel/store/hooks";
import { leftPanelTitleChanged } from "@kernel/layout/ations";
import CompositionTree from "./CompositionTree";
import MannequinControls from "./MannequinSection";

export interface ComposerLeftPanelContentProps {
  rootId?: string;
}

const ComposerLeftPanelContent = ({
  rootId = "root",
}: ComposerLeftPanelContentProps) => {
  const dispatch = useAppDispatch();
  const {
    viewport: { graphId },
  } = useComposerUIState();
  if (!graphId) return null;

  useEffect(() => {
    dispatch(leftPanelTitleChanged("Detalhes"));
  }, [graphId]);

  const graph = useGraph(graphId);
  if (!graph) return null;

  const { mannequinLayer } = graph.instance.nodes;

  return (
    <>
      {!isEmpty(graph.instance.nodes) && (
        <AccordionSection title="Árvore de composição">
          <CompositionTree graphId={graphId} rootId={rootId} />
        </AccordionSection>
      )}

      {mannequinLayer && (
        <AccordionSection title="Maneco">
          <MannequinControls graphId={graphId} />
        </AccordionSection>
      )}
    </>
  );
};

ComposerLeftPanelContent.defaultProps = {
  rootId: "root",
};

export default ComposerLeftPanelContent;
