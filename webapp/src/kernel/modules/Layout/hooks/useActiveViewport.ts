
import { useMemo } from "react"
import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"

import { ViewportState } from "../store/viewports/state"
import { getViewportState, selectActiveViewport } from "../store/viewports/selectors"




/**
 * Stand-in for an active viewport that does not exist. Module-level so its
 * identity is stable — it is a dependency of callers' memos.
 *
 * The pointer can genuinely dangle: `activeViewport` and the viewport states
 * are two separate files under `.session`, so a session whose pointer names a
 * tab that was never written back (or was pruned) rehydrates with the name of
 * a viewport that is not there. Every caller reads `.name` unconditionally, so
 * handing them `undefined` took the whole tab bar down on reload. Home is the
 * viewport that always exists, and it is where an unresolvable pointer should
 * land anyway.
 */
const HOME_VIEWPORT: ViewportState = {
    name: "home",
    title: "",
    type: "home",
};

export function useActiveViewport<S = any>():ViewportState<S>{

    const storeModule = useModule<Store>("Store");
    const { useAppSelector } = storeModule.hooks;

    const selectedViewport = useAppSelector(selectActiveViewport);
    const viewportSelector = useMemo(() => getViewportState(selectedViewport!), [selectedViewport]);
    const viewport = useAppSelector(viewportSelector) as ViewportState<S> | undefined;
    return viewport ?? (HOME_VIEWPORT as ViewportState<S>)
}

export default useActiveViewport