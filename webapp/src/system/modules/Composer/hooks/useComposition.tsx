import { createSelector } from "reselect";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";

import { addMaterial, addMaterialType, selectPart } from "../store/actions";
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

  const innerState = useAppSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName]
  );

  const graph = useGraph(innerState?.graphId!, (g) => g?.adjacencyList);

  return {
    state: compositionState,
    actions: {
      selectPart(partName) {
        dispatch(selectPart({ compositionName, partName }));
        panelsManager.functions.openDetails();
      },
      changeMaterialType(materialUsageId, materialType) {
        // check if material type is in the graph
        if (!graph.actions.nodeExists(materialType)){
          // add material to the model
          dispatch(addMaterialType({compositionName:innerState?.name!, materialType}))
        }

        graph.actions.updateNode({
          id: materialUsageId,
          materialType: materialType,
        });
      },
      changeMaterial(materialUsageId, materialId) {
        console.log(materialUsageId, materialId);

        if (!graph.actions.nodeExists(`material-${materialId}`)){
          // add material to the model
          dispatch(addMaterial({compositionName:innerState?.name!, materialId}))

        }

        graph.actions.updateNode({
          id: materialUsageId,
          materialId: materialId,
        });
      },
    },
  };
};

export default useComposition;
