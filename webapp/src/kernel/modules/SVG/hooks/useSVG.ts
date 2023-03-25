import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { CSSProperties } from "react";
import { createSelector } from "reselect";
import { addProxy, updateProxy } from "../store/actions";
import { SVGState, SVGModuleState } from "../store/state";

interface SVG<T = SVGState> {
  state: T | undefined;
  actions: {
    addProxy(id: string, proxySet:string, styles: CSSProperties): void;
    updateProxy(id: string, proxySet: string, changes: Partial<CSSProperties>): void;
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
      addProxy(id, proxySet, styles) {
        dispatch(addProxy({ path,proxySet, id, styles }));
      },
      updateProxy(id, proxySet, changes){
        dispatch(updateProxy({ path,proxySet, id, changes }));
      }
    },
  };
};

export default useSVG;
