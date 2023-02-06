import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Box, Paper } from "@mui/material";
import { useCallback } from "react";
import { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";
import { selectCompositionStateByViewportName } from "../store/selectors";
import ComposerSettingsPanel from "./SettingsPanel";
import FloatingButtons from "./FloatingButtons";

export const Composerviewport = () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const {
    components: { SVGViewer },
  } = useModule<ISVGModule>("SVG");
  const { SettingsPanel, DetailsPanel, Accordion } = layoutModule.components;

  const { useAppSelector } = storeModule.hooks;
  const panelsManager = layoutModule.hooks.usePanelsManager();

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);
  const compositionState = useAppSelector(
    selectCompositionStateByViewportName(activeViewport!)
  );

  console.log(compositionState);
  const beforeInjectionHandle = useCallback((svg: SVGSVGElement) => {
    // e.stopPropagation()
    svg.addEventListener("click", () => {
      panelsManager.functions.openDetails();
    });
  }, []);

  if (!compositionState) return null;

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
          path={compositionState.svgPath}
          beforeInjection={beforeInjectionHandle}
        />

        <ComposerSettingsPanel />

        <DetailsPanel display={true}>
          <>Detalhes</>
        </DetailsPanel>
      </Box>
      <FloatingButtons />
    </>
  );
};

export default Composerviewport;
