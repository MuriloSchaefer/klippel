import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { useMemo } from "react";
import { useEffect } from "react";
import { createSelector } from "reselect";
import { selectPart } from "../store/actions";
import { ComposerState, CompositionState } from "../store/state";

interface CompositionActions {
  selectPart(partName: string): void;
  changeMaterialType(materialUsageId: string, materialType: string): void;
  changeMaterial(materialUsageId: string, material: number): void;
}
export interface Composition<T = CompositionState> {
  state: T | undefined;
  actions: CompositionActions;
}

const useComposition = <C = Composition, R = C>(
  compositionName: string,
  compositionSelector: (
    composition: CompositionState | undefined
  ) => R | undefined
): Composition<R> => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");

  const panelsManager = layoutModule.hooks.usePanelsManager();

  const { useGraph } = graphModule.hooks;
  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const selector = createSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName],
    compositionSelector
  );
  const compositionState = useAppSelector<R | undefined>(selector);

  const state = useAppSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName]
  );

  const graph = useGraph(state?.graphId!, (g) => g?.adjacencyList);

  return {
    state: compositionState,
    actions: {
      selectPart(partName) {
        dispatch(selectPart({ compositionName, partName }));
        panelsManager.functions.openDetails();
      },
      changeMaterialType(materialUsageId, materialType) {
        // check if material type is in the graph

        graph.actions.updateNode({ id: materialUsageId, materialType: materialType });
      },
      changeMaterial(nodeId, materialId) {},
    },
  };
};

export default useComposition;
