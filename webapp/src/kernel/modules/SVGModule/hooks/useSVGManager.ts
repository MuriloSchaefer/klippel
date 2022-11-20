import { IManager } from "@kernel/modules/base";
import { useAppDispatch } from "@kernel/store/hooks";
import { startSVGLoad, storeSVG, SVGLoaded } from "../store/actions";


interface ISVGManager extends IManager{
    methods: {
        loadSVG: (path: string) => Promise<string>
        storeSVG: (path: string, svgXML: string)=>void
    }
}

const useSVGManager = (): ISVGManager => {
    const dispatch = useAppDispatch()

    return {
        methods: {
            loadSVG: async (path: string) => {
                dispatch(startSVGLoad({path}))
                const response = await fetch(path);
                const blob = await response.blob();
                dispatch(SVGLoaded({path}))
                return blob.text();
              },
            storeSVG: (path:string, svgXML: string) => {
                dispatch(storeSVG({path, raw:svgXML}))
            }
        }
    }
}

export default useSVGManager;