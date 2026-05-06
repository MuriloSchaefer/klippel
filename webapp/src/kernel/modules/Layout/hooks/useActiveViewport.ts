
import { useMemo } from "react"
import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"

import { ViewportState } from "../store/viewports/state"
import { getViewportState, selectActiveViewport } from "../store/viewports/selectors"




export function useActiveViewport<S = any>():ViewportState<S>{

    const storeModule = useModule<Store>("Store");
    const { useAppSelector } = storeModule.hooks;

    const selectedViewport = useAppSelector(selectActiveViewport);
    const viewportSelector = useMemo(() => getViewportState(selectedViewport!), [selectedViewport]);
    return useAppSelector(viewportSelector) as ViewportState<S>
}

export default useActiveViewport