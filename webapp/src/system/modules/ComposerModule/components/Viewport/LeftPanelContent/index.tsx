import React, { useEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import { useAppDispatch } from "@kernel/store (deprecated)/hooks";
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

  const { useActiveViewport } = layoutModule.hooks.module;

  const viewport = useActiveViewport();
  const composerViewport = useComposerUIState((ui) => ui.viewports[viewport.state.id]);


  useEffect(()=>{
    viewport.hooks.setSettingsPanelTitle(`Configurações`)
  }, [])

  if (!composerViewport.graphId) return null;
  return (
    <AccordionSection title="Árvore de composição">
      <CompositionTree graphId={composerViewport.graphId} rootId={rootId} />
    </AccordionSection>
  );
};

ComposerLeftPanelContent.defaultProps = {
  rootId: "root",
};

export default ComposerLeftPanelContent;
