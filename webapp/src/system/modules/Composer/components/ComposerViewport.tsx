import React, { useCallback } from "react";
import _, { debounce } from "lodash";

import { Box } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";

import ComposerSettingsPanel from "./SettingsPanel";
import ComposerDetailsPanel from "./DetailsPanel";
import FloatingButtons from "./FloatingButtons";
import useComposition from "../hooks/useComposition";
import { CompositionState } from "../store/composition/state";
import { IGraphModule } from "@kernel/modules/Graphs";
import { IPointerModule } from "@kernel/modules/Pointer";


export const ComposerViewportLoader = () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useAppSelector } = storeModule.hooks;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const selector = useCallback(
    (c: CompositionState | undefined) => ({
      svgPath: c?.svgPath,
      name: c?.name,
      graphId: c?.graphId,
    }),
    [activeViewport]
  );
  const composition = useComposition(activeViewport!, selector);

  if (
    !composition.state?.name ||
    !composition.state?.svgPath ||
    !composition.state?.graphId
  )
    return null;

  return (
    <ComposerViewport
      selectPart={composition.actions.selectPart}
      name={composition.state.name}
      svgPath={composition.state.svgPath}
      graphId={composition.state.graphId}
    />
  );
};

export const ComposerViewport = ({
  name,
  svgPath,
  graphId,
  selectPart,
}: {
  name: string;
  selectPart: (name: string) => void;
  svgPath: string;
  graphId: string;
}) => {
  const {
    components: { SVGViewer }, hooks: {useSVG},
  } = useModule<ISVGModule>("SVG");

  const {
    components: { MultiTouchPanel },
  } = useModule<IPointerModule>("Pointer");

  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const nodes = useGraph(graphId, (g) => g?.nodes);
  const svg = useSVG(svgPath, svg => svg?.instances[name])

  const beforeInjectionHandle = useCallback(
    (svgRoot: SVGSVGElement) => {
      if (!nodes.state) return;
      Object.values(nodes.state)
        .filter((n) => n.type === "PART")
        .forEach((n) => {
          if (n.domId) {
            const [element] = [...svgRoot?.querySelectorAll(`#${n.domId}`)];
            element.addEventListener("click", (e) => {
              console.log(e)
              e.stopPropagation();
              selectPart(n.id);
            });
          }
        });
    },
    [graphId]
  );


  return (
    <>
      <Box
        role="composer-viewport"
        sx={{
          padding: 1,
          height: "100%",
          position: "relative",
          cursor: "crosshair",
          overflow: 'hidden'
        }}
      >
        <MultiTouchPanel
          gestures={{
            onPinch: (state) => {
              svg.actions.setZoom(name, state.offset[0])
            },
            onWheel: (state) => {
              const currentZoom = svg.state?.zoom ?? 1
              //svg.actions.setPan(name, state.event.pageX, state.event.pageY)
              svg.actions.setZoom(name, currentZoom + (state.delta[1] * 0.001))
            }
          }}
        >
          <SVGViewer
            instanceName={name}
            path={svgPath}
            beforeInjection={beforeInjectionHandle}
          
          />
        </MultiTouchPanel>

        <ComposerSettingsPanel graphId={graphId} />

        <ComposerDetailsPanel graphId={graphId} />
      </Box>
      <FloatingButtons />
    </>
  );
};

export default ComposerViewportLoader;
