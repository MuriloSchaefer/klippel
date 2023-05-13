import { createSelector } from "reselect";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";

import {
  addMaterial,
  addMaterialType,
  changeMaterial,
  selectPart,
} from "../store/composition/actions";
import { ComposerState } from "../store/state";
import {
  CompositionGraph,
  CompositionState,
  MaterialNode,
} from "../store/composition/state";
import { ISVGModule } from "@kernel/modules/SVG";

interface CompositionActions {
  selectPart(partName: string): void;
  changeMaterialType(materialUsageId: string, materialType: string): void;
  changeMaterial(materialUsageId: string, material: number): void;
}
export interface Composition<T = CompositionState> {
  state: T | undefined;
  actions: CompositionActions;
}

export interface NonNullComposition<T = CompositionState> {
  state: T;
  actions: CompositionActions;
}

const useComposition = <C = Composition, R = C>(
  compositionName: string,
  compositionSelector: (composition: CompositionState | undefined) => R
): Composition<R> => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");
  const svgModule = useModule<ISVGModule>("SVG");

  const panelsManager = layoutModule.hooks.usePanelsManager();

  const { useGraph } = graphModule.hooks;
  const { useAppDispatch } = storeModule.hooks;
  const { useSVG } = svgModule.hooks;
  const dispatch = useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const selector = createSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName],
    compositionSelector
  );
  const compositionState = useAppSelector(selector);

  const innerState = useAppSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName]
  );

  const graph = useGraph<CompositionGraph, Partial<CompositionGraph>>(
    innerState?.graphId!,
    (g) => ({
      adjacencyList: g?.adjacencyList,
      nodes: g?.nodes,
    })
  );

  const svg = useSVG(innerState?.svgPath!, (svg) => svg);

  return {
    state: compositionState,
    actions: {
      selectPart(partName) {
        dispatch(selectPart({ compositionName, partName }));
        panelsManager.functions.openDetails();
      },
      changeMaterialType(materialUsageId, materialType) {
        // check if material type is in the graph
        if (!graph.actions.nodeExists(materialType)) {
          // add material to the model
          dispatch(
            addMaterialType({
              compositionName: innerState?.name!,
              materialType,
            })
          );
        }

        graph.actions.updateNode({
          id: materialUsageId,
          materialType: materialType,
        });
      },
      changeMaterial(materialUsageId, materialId) {
        dispatch(
          changeMaterial({
            compositionName: innerState?.name!,
            materialUsageId,
            materialId,
          })
        );
      },
    },
  };
};

export default useComposition;
