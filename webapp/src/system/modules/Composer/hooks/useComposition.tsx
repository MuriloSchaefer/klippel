import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"
import { selectPart } from "../store/actions"
import { CompositionState } from "../store/state"


interface Composition {
    state: CompositionState | undefined
    actions: {
        selectPart(partName: string): void
    }
}

const useComposition = (compositionName: string): Composition => {
    const storeModule = useModule<Store>('Store')
    const {useAppDispatch } = storeModule.hooks
    const dispatch = useAppDispatch()
    return {
        state: undefined,
        actions: {
            selectPart(partName){
                dispatch(selectPart({compositionName, partName}))
            }
        }
    }
}

export default useComposition