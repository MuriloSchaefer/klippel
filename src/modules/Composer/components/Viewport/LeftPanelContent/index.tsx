import React, { useEffect } from "react";

import AccordionSection from "@kernel/layout/components/Sidepanels/components/AccordionSection";

import { useComposerUIState } from "modules/Composer/hooks/useComposerUIState";
import { useAppDispatch } from "@kernel/store/hooks";
import { leftPanelTitleChanged } from "@kernel/layout/ations";
import CompositionTree from "./CompositionTree";

export interface ComposerLeftPanelContentProps {
  rootId?: string;
}

const ComposerLeftPanelContent = ({
  rootId = "root",
}: ComposerLeftPanelContentProps) => {
  const dispatch = useAppDispatch();
  const graphId = useComposerUIState((ui) => ui.viewport.graphId);

  useEffect(() => {
    dispatch(leftPanelTitleChanged("Detalhes"));
  }, [graphId]);

  if (!graphId) return null;
  return (
    <AccordionSection title="Árvore de composição">
      <CompositionTree graphId={graphId} rootId={rootId} />
    </AccordionSection>
  );
};

ComposerLeftPanelContent.defaultProps = {
  rootId: "root",
};

export default ComposerLeftPanelContent;
