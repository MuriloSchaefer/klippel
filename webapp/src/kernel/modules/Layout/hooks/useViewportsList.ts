import { useMemo } from "react";

import useModule from "@kernel/hooks/useModule"
import type { Store } from "@kernel/modules/Store"

import type { ViewportState } from "../store/viewports/state"

export function useViewportsList<S = object>():{[name: string]: ViewportState<S>}{

    const storeModule = useModule<Store>("Store");
    const { useDirectory, useAppSelector } = storeModule.hooks;

    const dir = useDirectory('.session/Layout/viewPortManager/viewports')
    const viewports = useMemo(()=>dir.list(), [dir])

    
    return {}
}

export default useViewportsList