import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";


// kernel imports
import {
  Viewport,
  ViewportProps,
} from "@kernel/modules/LayoutModule/components/Viewport";
import SettingsPanel from "@kernel/modules/LayoutModule/components/Sidepanels/SettingsPanel";
import DetailsPanel from "@kernel/modules/LayoutModule/components/Sidepanels/DetailsPanel";
import { newGraph } from "@kernel/modules/GraphsModule/store/graphsManagerSlice";
import FloatingShortcutsContainer from "@kernel/modules/MouseModule/components/Shortcuts";
import SVGViewer from "@kernel/modules/SVGModule/components/SVGViewer";

import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/LayoutModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";
import { IMouseModule } from "@kernel/modules/MouseModule";

// internal imports
import ComposerRightPanelContent from "./RightPanelContent";
import ComposerLeftPanelContent from "./LeftPanelContent";
import Proxies from "./proxies";

import { CompositionGraphState } from "../../store/state";
import { materialSelectedEvent, setSVGPath } from "../../store/actions";
import useComposerUIState from "../../hooks/useComposerUIState";
import Shortcuts from "./shortcuts";

const StyledViewport = styled.div`
  cursor: crosshair;
`;

interface ComposerViewportProps extends ViewportProps {
  mannequinSize?: string;
  product?: string;
  model?: string;
}

const ComposerViewport = ({
  mannequinSize = "p",
  product = "camiseta-fem",
  model = "modelo",
}: ComposerViewportProps) => {
  // Hooks
  const dispatch = useAppDispatch();

  const layoutModule = useModule<ILayoutModule>("LayoutModule");
  const graphModule = useModule<IGraphModule>("GraphModule");
  const mouseModule = useModule<IMouseModule>("MouseModule");

  const { useActiveViewport, } = layoutModule.hooks.module
  const { useFloatingShortcuts, useFloatingShortcutsManager } = mouseModule.hooks.module

  const viewport = useActiveViewport();
  const composerUI = useComposerUIState(ui => ui.viewports[viewport.state.id])
  
  const floatingShortcuts = useFloatingShortcuts(
    `${viewport.state.id}-shortcuts`
  );
  const floatingShortcutsManager =
    useFloatingShortcutsManager();

  const selectId = (g: any) => g && g.id

  const graph = graphModule.hooks.module.useGraph<CompositionGraphState, string>(
    composerUI.graphId,
    selectId
  );

  const svgPath = useMemo(()=>`/catalog/${product}/${model}.svg`, [product, model])

  useEffect(() => {
    if(!graph.state){
      dispatch(newGraph(viewport.state.id));
    }
    if (!floatingShortcuts.state) {
      floatingShortcutsManager.hooks.createShortcuts(
        `${viewport.state.id}-shortcuts`
      );
    }
    dispatch(setSVGPath({viewportId: viewport.state.id, svgPath}))
  }, []);

  const injectProxy = (svg: SVGElement) => {
    const nodes = [...svg.querySelectorAll('g>metadata')]
    nodes.forEach(node => {
      const group = node.closest('g')
      group?.addEventListener('click', (evt) => {

        // Add floating shortcuts
        floatingShortcuts.hooks.showShortcuts<{viewportId: string, nodeId: string}>(evt, {viewportId: viewport.state.id, nodeId: group.id});
        evt.stopPropagation()
      })

      group?.addEventListener('dblclick', (evt) => {

        // select element
        dispatch(materialSelectedEvent({ id: group.id, viewportId: composerUI.viewportId }));

        evt.stopPropagation()
      })
    })
  }

  return (
    <>
      <SettingsPanel>
        <ComposerLeftPanelContent />
      </SettingsPanel>
      <StyledViewport>
        <FloatingShortcutsContainer id={composerUI.UI.shortcuts.id}>
          <Shortcuts viewportId={viewport.state.id}/>
        </FloatingShortcutsContainer>
        <Viewport innerRef={null} id={viewport.state.id}>
          <>
          <SVGViewer path={svgPath} beforeInjection={injectProxy}/>
          <Proxies  viewportId={viewport.state.id}/>
          </>
        </Viewport>
      </StyledViewport>
      <DetailsPanel>
        <ComposerRightPanelContent />
      </DetailsPanel>
    </>
  );
};

ComposerViewport.defaultProps = {
  mannequinSize: "p",
  product: "camiseta-fem",
  model: "modelo",
};

export default React.memo(ComposerViewport);
