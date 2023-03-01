import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Box, Paper } from "@mui/material";
import React, { useCallback, useEffect, useMemo } from "react";
import { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";
import { selectCompositionStateByViewportName } from "../store/selectors";
import ComposerSettingsPanel from "./SettingsPanel";
import ComposerDetailsPanel from "./DetailsPanel";
import FloatingButtons from "./FloatingButtons";
import useComposition, { Composition } from "../hooks/useComposition";
import useGraph from "@kernel/modules/Graphs/hooks/useGraph";
import _ from "lodash";
import Part from "../interfaces";
import { CompositionState } from "../store/state";
import useRDFInterpreter from "../hooks/useRDFInterpreter";
import { IndexedFormula, literal } from "rdflib";

export const ComposerViewportLoader = () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useAppSelector } = storeModule.hooks;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const selector = useCallback((c: CompositionState | undefined) => ({
    svgPath: c?.svgPath,
    graphId: c?.graphId,
  }), [])

  const composition = useComposition(activeViewport!, selector);
  

  if (!composition.state?.svgPath || !composition.state?.graphId) return null;

  return <ComposerViewport svgPath={composition.state.svgPath} />
};

export const ComposerViewport = ({ svgPath }: { svgPath: string }) => {

  const {
    components: { SVGViewer },
    hooks: { useSVG },
  } = useModule<ISVGModule>("SVG");
  const svgManager = useSVG(svgPath, svg => svg)


  const beforeInjectionHandle = useCallback((svgRoot: SVGSVGElement) => {

    // parts.forEach(part => {
    //   const domId = interpreter.any(part.subject, SELF('DOMId'), undefined)
    //   const [element] = [...svgRoot?.querySelectorAll(`#${domId}`)];
    //   element.addEventListener('click', (e) => {
    //     e.stopPropagation()
    //     console.log(part.subject.value.replace('_:#', ''))
    //     selectPart(part.subject.value.replace('_:#', ''))
    //   })
    // })


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
        <SVGViewer
          path={svgPath}
          beforeInjection={beforeInjectionHandle}
        />

        <ComposerSettingsPanel />

        <ComposerDetailsPanel />
      </Box>
      <FloatingButtons />
    </>
  );

}

export default React.memo(ComposerViewportLoader);
