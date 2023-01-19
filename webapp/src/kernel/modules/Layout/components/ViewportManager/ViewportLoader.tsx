import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import React, { useContext } from "react";
import { getViewportState, selectActiveViewport } from "../../store/viewports/selectors";
import { ViewportTypeContext } from "./ViewportTypeProvider";

const ViewportLoader = ()=> {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const activeViewport = useAppSelector(selectActiveViewport);
  const viewportState = useAppSelector(getViewportState(activeViewport));
    
  const {types } = useContext(ViewportTypeContext)

  if (!(viewportState.type in types)) return null

  return React.createElement(types[viewportState.type], viewportState)
}

export default ViewportLoader