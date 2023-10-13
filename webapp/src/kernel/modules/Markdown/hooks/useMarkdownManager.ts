import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"
import { loadMarkdown } from "../store/actions";

type MarkdownManager = {
    loadMarkdown: (path: string) => void
}

export default (): MarkdownManager => {
    const storeModule = useModule<Store>('Store')
    const {hooks: {useAppDispatch}} = storeModule

    const dispatch = useAppDispatch()
    return {
        loadMarkdown(path){
            dispatch(loadMarkdown({path}))
        }
    }
}