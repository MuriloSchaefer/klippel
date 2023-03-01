import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { useMemo } from "react";
import { useEffect } from "react";
import { createSelector } from "reselect";
import { selectPart } from "../store/actions";
import { ComposerState, CompositionState } from "../store/state";


interface CompositionActions {
  selectPart(partName: string): void;
}
export interface Composition<T = CompositionState> {
  state: T | undefined;
  actions: CompositionActions;
}

const useComposition = <C=Composition, R=C>(
  compositionName: string,
  compositionSelector: (composition: CompositionState | undefined) => R | undefined
): Composition<R> => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const panelsManager = layoutModule.hooks.usePanelsManager();

  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector

  const selector = createSelector(
    (state: {Composer: ComposerState} | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName],
      compositionSelector
  );
  const compositionState = useAppSelector<R | undefined>(selector);

  const actions: CompositionActions = useMemo(()=> ({
    selectPart(partName) {
      dispatch(selectPart({ compositionName, partName }));
      panelsManager.functions.openDetails();
    },
  }), [])

  return {
    state: compositionState,
    actions,
  };
};

export default useComposition;
