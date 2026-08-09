import { ErrorBoundary } from "react-error-boundary";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import React from "react";
import { VIEWPORT_TYPE_REGISTRY_NAME } from "../../constants";
import {
  getViewportState,
} from "../../store/viewports/selectors";
import useActiveViewport from "../../hooks/useActiveViewport";
import { fallbackRender } from "@kernel/App";

const ViewportLoader = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const componentsRegistryManager = storeModule.managers.componentRegistry();

  const activeViewport = useActiveViewport();
  const viewportState = useAppSelector(getViewportState(activeViewport.name));

  if (!viewportState) return null;
  const comp = componentsRegistryManager.functions.getComponent(
    VIEWPORT_TYPE_REGISTRY_NAME,
    viewportState.type
  );
  if (!comp) return null;

  return (
    <ErrorBoundary
      FallbackComponent={fallbackRender}
    >
      {/*
        Keyed by viewport name so each tab is its own component instance.
        Without the key, switching between two tabs of the *same* type reuses one
        fiber — React sees the same element type in the same position and only
        swaps props. Every piece of component-local state then carries across the
        switch: `useMemo` caches, refs, d3 zoom behaviours. That leaked one tab's
        rendering into another's, most visibly in the SVG editor, whose parsed
        document is memoised on the content string: two variations of one model
        hold *equal* content strings, so the memo never recomputed and the second
        tab inherited the first's proxy mutations (its colours).

        The cost is a real unmount/remount per tab switch — the incoming tab
        re-parses its document and re-seeds its zoom from persisted state. That
        is the price of tabs being independent, and it is what the user already
        expects a tab to be.
      */}
      {React.createElement(comp, { ...viewportState, key: viewportState.name })}
    </ErrorBoundary>
  );
};

export default React.memo(ViewportLoader);
