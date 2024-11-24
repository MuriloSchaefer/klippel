import { useCallback, useMemo } from "react";

import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import LanIcon from "@mui/icons-material/Lan";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { NodesHashMap } from "@kernel/modules/Graphs/store/state";
import type { IOrderModule } from "@system/modules/Orders";
import type { BudgetFloatingButtonActions } from "@system/modules/Orders/typings";

import ComposerSettingsPanel from "./SettingsPanel";
import ComposerDetailsPanel from "./DetailsPanel";
import useComposition from "../hooks/useComposition";
import type {
  CompositionGraph,
  CompositionNode,
  CompositionState,
  PartNode,
} from "../store/composition/state";
import useCompositionsManager from "../hooks/useCompositionsManager";

import GradesCounter from "./GradesCounter";

type CompositionInfo = Omit<CompositionState, "selectedPart" | "loading">;

export const ComposerViewportLoader = () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const svgModule = useModule<ISVGModule>("SVG");

  const { useAppSelector } = storeModule.hooks;
  const {
    components: { SVGEditorToolkit },
  } = svgModule;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const selector = useCallback(
    (c: CompositionState | undefined) => c as CompositionInfo,
    [activeViewport]
  );
  const composition = useComposition(
    { viewportName: activeViewport! },
    selector
  );

  if (!activeViewport || !composition.state)
    // TODO: add loading
    return null;

  return (
    <SVGEditorToolkit>
      <ComposerViewport
        selectPart={composition.actions.selectPart}
        compositionInfo={composition.state}
      />
    </SVGEditorToolkit>
  );
};

export const ComposerViewport = ({
  compositionInfo,
  selectPart,
}: {
  selectPart: (name: string) => void;
  compositionInfo: CompositionInfo;
}) => {
  const { graphId, svgPath, name, viewportName, budget } = compositionInfo;
  const {
    hooks: { useSVGEditor },
  } = useModule<ISVGModule>("SVG");

  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const layoutModule = useModule<ILayoutModule>("Layout");
  const ordersModule = useModule<IOrderModule>("Orders");

  const { BudgetFloatingButton } = ordersModule.components;
  const { ViewportNotificationsTray } = layoutModule.components;

  const theme = useTheme();

  const compositionManager = useCompositionsManager();
  const nodes = useGraph<
    CompositionGraph,
    NodesHashMap<CompositionNode> | undefined
  >(graphId, (g) => g?.nodes);

  const beforeInjection = useCallback(
    (svgRoot: SVGSVGElement) => {
      if (!nodes.state) return svgRoot;

      // QUESTION: do we actually need to select part by clicking on element?
      // Object.values(nodes.state)
      //   .filter((n): n is PartNode => n.type === "PART" || n.type === "GARMENT")
      //   .forEach((n) => {
      //     console.log("attaching selection events");
      //     if (n.domId) {
      //       const [element] = [
      //         ...(svgRoot?.querySelectorAll(`#${n.domId}`) ?? []),
      //       ];
      //       element.addEventListener(
      //         "click",
      //         (e) => {
      //           console.log("selected");
      //           e.stopPropagation();
      //           selectPart(n.id);
      //           const element = e.target as SVGElement;
      //           element.setAttribute("stroke", theme.palette.primary.main);
      //           element.setAttribute("stroke-width", "30");
      //         },
      //         { once: true }
      //       );
      //     }
      //   });
      return svgRoot;
    },
    [graphId, nodes]
  );

  const editor = useSVGEditor({ svgPath, instanceName: name, beforeInjection });

  const allowedActions: BudgetFloatingButtonActions[] = useMemo(() => {
    if (!budget) return ["create-budget", "add-to-budget"];
    return ["convert-to-order", "delete-budget"];
  }, [budget]);

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
        <div
          ref={editor.wrapperRef}
          role="svg-editor"
          style={{ height: "100%", width: "100%" }}
        >
          <svg
            ref={editor.svgRef}
            id={`svg-editor`}
            width="100%"
            height="100%"
          />
        </div>

        <ViewportNotificationsTray>
          <LanIcon
            fontSize="small"
            onClick={handleShowGraphClick}
            sx={{ ":hover": { cursor: "pointer", color: "primary.main" } }}
          />
        </ViewportNotificationsTray>

        <ComposerSettingsPanel />
        <ComposerDetailsPanel />
      </Box>
      <Box
        sx={{
          position: "absolute",
          display: "flex",
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          gap: 1,
          padding: 1,
          alignItems: "end",
          bottom: 10,
          width: "100%",
          pointerEvents: "none",
        }}
      >
        <BudgetFloatingButton allowedActions={allowedActions} />
        {budget && <GradesCounter compositionName={name} graphId={graphId} />}
      </Box>
    </>
  );
};

export default ComposerViewportLoader;
