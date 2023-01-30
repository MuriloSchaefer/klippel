import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import React, { useContext } from "react";
import { VIEWPORT_TYPE_REGISTRY_NAME } from "../../constants";
import { getViewportState, selectActiveViewport } from "../../store/viewports/selectors";
import { ViewportTypeContext } from "./ViewportTypeProvider";

const ViewportLoader = ()=> {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector,  } = storeModule.hooks;
  const componentsRegistryManager = storeModule.managers.componentRegistry();

  const activeViewport = useAppSelector(selectActiveViewport);
  const viewportState = useAppSelector(getViewportState(activeViewport));
  
  if (!viewportState) return null
  const comp = componentsRegistryManager.functions.getComponent(VIEWPORT_TYPE_REGISTRY_NAME, viewportState.type)
  if (!comp) return null

  return React.createElement(comp, viewportState, [])
}

export default ViewportLoader