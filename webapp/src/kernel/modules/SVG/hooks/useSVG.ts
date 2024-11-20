import { useMemo } from "react";

import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";

import {
  updateSVG,
} from "../store/actions";
import type { SVGInstance } from "../store/state";
import { selectSVGState } from "../store/selectors";

interface SVG {
  state: {
    instance: SVGInstance;
    DOMroot: SVGSVGElement;
  };
  transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement): void;
}

const useSVG = (path: string, instanceName: string): SVG | undefined => {
  const storeModule = useModule<Store>("Store");

  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const state = useAppSelector(
    (state) => selectSVGState(path)(state)?.instances[instanceName]
  );

  const parsedSVG = useMemo(() => {
    if (!state?.content) return undefined;
    const svgRoot = new DOMParser()
      .parseFromString(state.content, "image/svg+xml")
      .querySelector("svg");

    return svgRoot;
  }, [state?.content]);

  if (!state || !parsedSVG) return; // TODO: add error handling

  return {
    state: { instance: state, DOMroot: parsedSVG },
    transform(fn) {
      const serialized = new XMLSerializer().serializeToString(fn(parsedSVG));
      dispatch(updateSVG({ path, instanceName, document: serialized }));
    },
  };
};

export default useSVG;
