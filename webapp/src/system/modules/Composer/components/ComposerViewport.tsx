import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Box, Paper } from "@mui/material";
import React, { useCallback, useEffect } from "react";
import { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";
import { selectCompositionStateByViewportName } from "../store/selectors";
import ComposerSettingsPanel from "./SettingsPanel";
import ComposerDetailsPanel from "./DetailsPanel";
import FloatingButtons from "./FloatingButtons";
import useComposition from "../hooks/useComposition";
import useGraph from "@kernel/modules/Graphs/hooks/useGraph";
import _ from "lodash";
import Part from "../interfaces";
import { CompositionState } from "../store/state";

export const Composerviewport = () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const {
    components: { SVGViewer },
    hooks: { useSVG },
  } = useModule<ISVGModule>("SVG");
  const { DetailsPanel } = layoutModule.components;

  const { useAppSelector } = storeModule.hooks;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);


  const selector = useCallback((c: CompositionState | undefined) => ({
    svgPath: c?.svgPath,
    graphId: c?.graphId,
  }), [])

  const composition = useComposition(activeViewport!, selector);


  useEffect(()=>{
    console.log('ComposerViewport', composition)
  }, [composition])

  const nodes = useGraph(composition.state?.graphId!, (g) =>
    Object.values(g?.nodes ?? {}).filter((n: Part) => !_.isEmpty(n.properties))
  );

  const beforeInjectionHandle = useCallback((svgRoot: SVGSVGElement) => {
    // const [element] = [...svg?.querySelectorAll(`#${id}`)];
    // inject proxies
    nodes.state?.forEach((node: Part) => {
      const elem = svgRoot.getElementById(node.id);
      if (elem)
        elem.addEventListener("click", (e) => {
          e.stopPropagation();
          composition.actions.selectPart(node.id);
        });
    });

    // inject handlers
    // svgRoot.addEventListener("click", (e: MouseEvent) => {
    // });
  }, []);

  if (!composition.state?.svgPath) return null;

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
        <SVGViewer
          path={composition.state.svgPath}
          beforeInjection={beforeInjectionHandle}
        />

        <ComposerSettingsPanel />

        <ComposerDetailsPanel />
      </Box>
      <FloatingButtons />
    </>
  );
};

export default React.memo(Composerviewport);
