import React, { useCallback } from "react";
import _ from "lodash";

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

  if (!composition.state?.name || !composition.state?.svgPath || !composition.state?.graphId) return null;

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
    components: { SVGViewer }  } = useModule<ISVGModule>("SVG");
  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const nodes = useGraph(graphId, (g) => g?.nodes);

  const beforeInjectionHandle = useCallback((svgRoot: SVGSVGElement) => {
    if (!nodes.state) return;
    Object.values(nodes.state)
      .filter((n) => n.type === "PART")
      .forEach((n) => {
        if (n.domId) {
          const [element] = [...svgRoot?.querySelectorAll(`#${n.domId}`)];
          element.addEventListener("click", (e) => {
            e.stopPropagation();
            selectPart(n.id);
          });
        }
      });
  }, [graphId]);

  return (
    <>
      <Box
        role="composer-viewport"
        sx={{
          padding: 1,
          height: "100%",
          position: "relative",
          cursor: "crosshair",
        }}
      >
        <SVGViewer instanceName={name} path={svgPath} beforeInjection={beforeInjectionHandle} />

        <ComposerSettingsPanel graphId={graphId} />

        <ComposerDetailsPanel graphId={graphId} />
      </Box>
      <FloatingButtons />
    </>
  );
};

export default ComposerViewportLoader;
