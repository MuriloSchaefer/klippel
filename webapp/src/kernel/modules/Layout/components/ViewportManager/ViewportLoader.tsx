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
      {React.createElement(comp, viewportState)}
    </ErrorBoundary>
  );
};

export default React.memo(ViewportLoader);
