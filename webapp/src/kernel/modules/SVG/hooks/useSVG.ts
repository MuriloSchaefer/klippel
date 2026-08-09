import { CSSProperties, useMemo } from "react";

import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";

import {
  addProxy,
  deleteProxy,
  setPan,
  setZoom,
  updateProxy,
  updateSVG,
} from "../store/actions";
import type { SVGInstance } from "../store/state";
import { selectSVGState } from "../store/selectors";
import { ZoomTransform } from "d3";

// Zoom/pan persistence runs on every wheel/drag event (debounced). We don't
// want those writes to re-render the React tree — d3 mutates the SVG DOM
// directly, and the persisted values are only read again to seed the initial
// transform when the viewport (re)mounts or the content/proxies change.
const svgInstanceEqual = (a?: SVGInstance, b?: SVGInstance): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.content === b.content && a.proxies === b.proxies;
};

interface SVG {
  state: {
    instance: SVGInstance;
    DOMroot: SVGSVGElement;
  };
  transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement): void;
  addProxy(id: string, styles: Partial<CSSProperties>): void;
  updateProxy(id: string, changes: Partial<CSSProperties>): void;
  deleteProxy(id: string): void;

  saveZoom(transform: ZoomTransform): void;
}

const useSVG = (path: string, instanceName: string): SVG | undefined => {
  const storeModule = useModule<Store>("Store");

  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const state = useAppSelector(
    (state): SVGInstance | undefined =>
      selectSVGState(path)(state)?.instances[instanceName],
    svgInstanceEqual as (a: unknown, b: unknown) => boolean,
  ) as SVGInstance | undefined;

  const parsedSVG = useMemo(() => {
    if (!state?.content) return undefined;
    const svgRoot = new DOMParser()
      .parseFromString(state.content, "image/svg+xml")
      .querySelector("svg");

    return svgRoot;
    // Instance-keyed as well as content-keyed: two instances of the same artwork
    // hold equal content strings, and `DOMroot` is handed out for mutation, so
    // content alone would share one document between them.
  }, [state?.content, path, instanceName]);

  if (!state || !parsedSVG) return; // TODO: add error handling

  return {
    state: { instance: state, DOMroot: parsedSVG },
    transform(fn) {
      const serialized = new XMLSerializer().serializeToString(fn(parsedSVG));
      dispatch(updateSVG({ path, instanceName, document: serialized }));
    },
    addProxy(id, styles) {
      dispatch(
        addProxy({ path, instanceName, id, styles })
      );
    },
    updateProxy(id, changes) {
      dispatch(
        updateProxy({ path, instanceName, id, changes })
      );
    },
    deleteProxy(id) {
      dispatch(
        deleteProxy({ path, instanceName, id })
      );
    },
    saveZoom(transform) {
      dispatch(
        setZoom({ path, instanceName, zoom: transform.k })
      );
      dispatch(
        setPan({ path, instanceName, x: transform.x, y: transform.y })
      )
    }
  };
};

export default useSVG;
