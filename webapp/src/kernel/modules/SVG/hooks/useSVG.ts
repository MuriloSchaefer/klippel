import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { CSSProperties } from "react";
import { createSelector } from "reselect";
import { addProxy } from "../store/actions";
import { SVGState, SVGModuleState } from "../store/state";

interface SVG<T = SVGState> {
  state: T | undefined;
  actions: {
    addProxy(id: string, styles: CSSProperties): void;
  };
}

const useSVG = <S = SVG, R = S>(
  path: string,
  svgSelector: (svg: SVGState | undefined) => R | undefined
): SVG<R> => {
  const storeModule = useModule<Store>("Store");

  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const selector = createSelector(
    (state: { SVG: SVGModuleState } | undefined) =>
      state && state.SVG.svgs[path],
    svgSelector
  );
  const state = useAppSelector<R | undefined>(selector);

  return {
    state: state,
    actions: {
      addProxy(id, styles) {
        dispatch(addProxy({ path, id, styles }));
        
      },
    },
  };
};

export default useSVG;
