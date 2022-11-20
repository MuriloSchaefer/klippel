import useModule from "@kernel/hooks/useModule"
import { useAppSelector } from "@kernel/store/hooks"
import { useEffect, useMemo } from "react"
import { ReactSVG } from "react-svg"
import { createSelector } from "reselect"


import { ISVGModule } from ".."
import { SVGState } from "../store/state"

interface SVGViewerProps {
    path: string,

    afterInjection?: () => void;
    beforeInjection?: (svg: SVGElement) => void;
}

const SVGViewer = ({path, beforeInjection, afterInjection}: SVGViewerProps) => {
    const SVGModule = useModule<ISVGModule>("SVGModule")
    const SVGManager = SVGModule.hooks.module.useSVGManager()
    const {loadSVG,storeSVG} = SVGManager.methods
    
    const svgSeletor = createSelector(
        (state: any) => state.SVGModule.svgs,
        (svgs) => svgs[path]
    )
    const svgState = useAppSelector<SVGState>(svgSeletor)

    useEffect(()=>{
        const getSVG = async () => {
            const svgXML = await loadSVG(path)
            storeSVG(path, svgXML)
        }

        if (!svgState){
            getSVG()
        }
    }, [path])


    const objURL = useMemo(
        () =>
          window.URL.createObjectURL(new Blob([svgState?.raw], { type: "image/svg+xml" })),
        [svgState?.raw]
      );

      const handleBeforeInjection = (svg: SVGElement | undefined) => {
        if (svg && beforeInjection) beforeInjection(svg)
      }

    return <>
    <ReactSVG
      src={objURL}
      beforeInjection={handleBeforeInjection}
      afterInjection={afterInjection}
      id={svgState?.DOMid}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
      }}
    />
  </>
}

export default SVGViewer