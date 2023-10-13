import { useLayoutEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";

import useCompositionsManager from "./useCompositionsManager";
import type { ComposerState, CompositionsList } from "../store/state";


export const useCompositionsList = (): CompositionsList => {
  const storeModule = useModule<Store>("Store");

  const { useAppSelector } = storeModule.hooks;
  const compositionManager = useCompositionsManager();

  const compositions = useAppSelector(
    (state: { Composer: ComposerState }) =>
      state.Composer.compositionsManager.compositionsList
  );
  

  useLayoutEffect(() => {
    compositionManager.functions.listCompositions();
  }, []);

  return compositions;
};

export default useCompositionsManager;
