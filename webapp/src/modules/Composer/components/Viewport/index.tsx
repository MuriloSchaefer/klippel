import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
// kernel imports
import {
  Viewport,
  ViewportProps,
} from "@kernel/modules/LayoutModule/components/Viewport";
import SettingsPanel from "@kernel/modules/LayoutModule/components/Sidepanels/SettingsPanel";
import DetailsPanel from "@kernel/modules/LayoutModule/components/Sidepanels/DetailsPanel";
import { useAppDispatch } from "@kernel/store/hooks";
import { newGraph } from "@kernel/modules/GraphsModule/store/graphsManagerSlice";

// internal imports
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/LayoutModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";

import { IMouseModule } from "@kernel/modules/MouseModule";
import { Composition } from "modules/Composer/interfaces/Composition";
import { Material } from "modules/Composer/interfaces/Material";
import FloatingShortcutsContainer from "@kernel/modules/MouseModule/components/Shortcuts";
import { CompositionGraphState } from "../../store/state";
import { materialSelectedEvent, parseGarment, setSVGPath } from "../../store/actions";
import Proxies from "./proxies";

import ComposerLeftPanelContent from "./LeftPanelContent";
import SVGManager from "../SVGManager";
import ComposerRightPanelContent from "./RightPanelContent";
import SVGProxies from "../SVGManager/SVGProxies";
import { ISVGModule } from "@kernel/modules/SVGModule";
import SVGViewer from "@kernel/modules/SVGModule/components/SVGViewer";
import { GARMENT_ID } from "modules/Composer/constants";
import useComposerUIState from "modules/Composer/hooks/useComposerUIState";
import { parseSVG, SVGInjected } from "@kernel/modules/SVGModule/store/actions";

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
  // const SVGModule = useModule<ISVGModule>("SVGModule");

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
        floatingShortcuts.hooks.showShortcuts(evt);
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
        <FloatingShortcutsContainer id={`${viewport.state.id}-shortcuts`}>
          <div style={{ width: "300px", height: "500px" }}>
            Viewport Shortcuts
          </div>
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
