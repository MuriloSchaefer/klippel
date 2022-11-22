import { IManager } from "@kernel/modules/base";
import { useAppDispatch } from "@kernel/store/hooks";
import { ISVGProxy } from "../interfaces";
import { loadSVG, storeSVG, SVGLoaded, syncProxy } from "../store/actions";


interface ISVGManager extends IManager {
    methods: {
        loadSVG: (path: string) => void,
        syncProxy: (path: string, proxy: ISVGProxy) => void
    }
}

const useSVGManager = (): ISVGManager => {
    const dispatch = useAppDispatch()

    return {
        methods: {
            loadSVG: (path: string) => {
                dispatch(loadSVG({ path }))
            },
            syncProxy: (path: string, proxy: ISVGProxy) => {
                dispatch(syncProxy({path, proxy}))
            }
        }
    }
}

export default useSVGManager;