import React, { useEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import { useAppDispatch } from "@kernel/store/hooks";
import { ILayoutModule } from "@kernel/modules/LayoutModule";
import AccordionSection from "@kernel/modules/LayoutModule/components/Sidepanels/components/AccordionSection";

import { useComposerUIState } from "../../../hooks/useComposerUIState";
import CompositionTree from "./CompositionTree";

export interface ComposerLeftPanelContentProps {
  rootId?: string;
}

const ComposerLeftPanelContent = ({
  rootId = "root",
}: ComposerLeftPanelContentProps) => {
  const layoutModule = useModule<ILayoutModule>("LayoutModule");

  const { leftPanelTitleChanged } = layoutModule.store.actions;

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
