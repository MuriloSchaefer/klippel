import React, { useCallback } from "react";
import _ from "lodash";

import Box from "@mui/material/Box";

import LanIcon from "@mui/icons-material/Lan";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";

import ComposerSettingsPanel from "./SettingsPanel";
import ComposerDetailsPanel from "./DetailsPanel";
import FloatingButtons from "./FloatingButtons";
import useComposition from "../hooks/useComposition";
import { CompositionGraph, CompositionNode, CompositionState, PartNode } from '../store/composition/state';
import { IGraphModule } from "@kernel/modules/Graphs";
import { IPointerModule } from "@kernel/modules/Pointer";
import useCompositionsManager from "../hooks/useCompositionsManager";
import { NodesHashMap } from "@kernel/modules/Graphs/store/state";

type CompositionInfo = Omit<CompositionState, "selectedPart" | "loading">;

export const ComposerViewportLoader = () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useAppSelector } = storeModule.hooks;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const selector = useCallback(
    (c: CompositionState | undefined) => c as CompositionInfo,
    [activeViewport]
  );
  const composition = useComposition(activeViewport!, selector);

  if (!activeViewport || !composition.state)
    // TODO: add loading
    return null;

  return (
    <ComposerViewport
      selectPart={composition.actions.selectPart}
      compositionInfo={composition.state}
    />
  );
};

export const ComposerViewport = ({
  compositionInfo,
  selectPart,
}: {
  selectPart: (name: string) => void;
  compositionInfo: CompositionInfo;
}) => {
  const {
    components: { SVGViewer },
    hooks: { useSVG },
  } = useModule<ISVGModule>("SVG");

  const {
    components: { MultiTouchPanel },
  } = useModule<IPointerModule>("Pointer");

  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const layoutModule = useModule<ILayoutModule>("Layout");

  const { ViewportNotificationsTray } = layoutModule.components;

  const { graphId, svgPath, name, viewportName } = compositionInfo;

  const compositionManager = useCompositionsManager();
  const nodes = useGraph<CompositionGraph, NodesHashMap<CompositionNode>|undefined>(graphId, (g) => g?.nodes);
  const svg = useSVG(svgPath, (svg) => svg?.instances[name]);

  const beforeInjectionHandle = useCallback(
    (svgRoot: SVGSVGElement) => {
      if (!nodes.state) return;
      Object.values(nodes.state)
        .filter((n): n is PartNode => n.type === "PART")
        .forEach((n) => {
          if (n.domId) {
            const [element] = [...svgRoot?.querySelectorAll(`#${n.domId}`)];
            element.addEventListener("click", (e) => {
              e.stopPropagation();
              selectPart(n.id);
            });
          }
        });
    },
    [graphId]
  );

  const handleShowGraphClick = useCallback(() => {
    compositionManager.functions.createDebugView(name, viewportName);
  }, []);

  return (
    <>
      <Box
        role="composer-viewport"
        sx={{
          padding: 1,
          height: "100%",
          position: "relative",
          cursor: "crosshair",
          overflow: "hidden",
        }}
      >
        <MultiTouchPanel
          gestures={{
            onPinch: (state) => {
              svg.actions.setZoom(name, state.offset[0]);
            },
            onWheel: (state) => {
              const currentZoom = svg.state?.zoom ?? 1;
              //svg.actions.setPan(name, state.event.pageX, state.event.pageY)
              svg.actions.setZoom(name, currentZoom + state.delta[1] * 0.001);
            },
          }}
        >
          <SVGViewer
            instanceName={name}
            path={svgPath}
            beforeInjection={beforeInjectionHandle}
          />
        </MultiTouchPanel>

        <ViewportNotificationsTray>
          <LanIcon
            fontSize="small"
            onClick={handleShowGraphClick}
            sx={{ ":hover": { cursor: "pointer", color: "primary.main" } }}
          />
        </ViewportNotificationsTray>
        <ComposerSettingsPanel />

        <ComposerDetailsPanel graphId={graphId} />
      </Box>
      <FloatingButtons />
    </>
  );
};

export default ComposerViewportLoader;
