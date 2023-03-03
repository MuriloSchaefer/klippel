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
import { CompositionState } from "../store/state";
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
      graphId: c?.graphId,
    }),
    []
  );

  const composition = useComposition(activeViewport!, selector);

  if (!composition.state?.svgPath || !composition.state?.graphId) return null;

  return (
    <ComposerViewport
      selectPart={composition.actions.selectPart}
      svgPath={composition.state.svgPath}
      graphId={composition.state.graphId}
    />
  );
};

export const ComposerViewport = ({
  svgPath,
  graphId,
  selectPart,
}: {
  selectPart: (name: string) => void;
  svgPath: string;
  graphId: string;
}) => {
  const {
    components: { SVGViewer },
    hooks: { useSVG },
  } = useModule<ISVGModule>("SVG");
  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const svgManager = useSVG(svgPath, (svg) => svg);
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
        }}
      >
        <SVGViewer path={svgPath} beforeInjection={beforeInjectionHandle} />

        <ComposerSettingsPanel />

        <ComposerDetailsPanel />
      </Box>
      <FloatingButtons />
    </>
  );
};

export default React.memo(ComposerViewportLoader);
