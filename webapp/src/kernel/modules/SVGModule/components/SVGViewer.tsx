import useModule from "@kernel/hooks/useModule"
import { useAppDispatch, useAppSelector } from "@kernel/store (deprecated)/hooks"
import React, { useEffect, useMemo } from "react"
import { ReactSVG } from "react-svg"
import { createSelector } from "reselect"


import { ISVGModule } from ".."
import { SVGInjected } from "../store/actions"
import { SVGState } from "../store/state"

interface SVGViewerProps {
  path: string,

  afterInjection?: () => void;
  beforeInjection?: (svg: SVGElement) => void;
}

const SVGViewer = ({ path, beforeInjection, afterInjection }: SVGViewerProps) => {
  const dispatch = useAppDispatch()
  const SVGModule = useModule<ISVGModule>("SVGModule")
  const SVGManager = SVGModule.hooks.module.useSVGManager()
  const { loadSVG } = SVGManager.methods

  const svgSeletor = createSelector(
    (state: any) => state.SVGModule.svgs,
    (svgs) => svgs[path]
  )
  const svgState = useAppSelector<SVGState>(svgSeletor)

  useEffect(() => {
    if (!svgState) {
      loadSVG(path)
    }
  }, [path])


  const objURL = useMemo(
    () =>
      window.URL.createObjectURL(new Blob([svgState?.raw], { type: "image/svg+xml" })),
    [svgState?.raw]
  );

  const handleBeforeInjection = (svg: SVGElement | undefined) => {
    if (svg){
      // apply proxies
      Object.values(svgState.proxies).forEach(proxy => {
        const element = svg.querySelector(`#${proxy.id}`)

        if (element){
          proxy.fill && element.setAttribute('fill', proxy.fill)
          proxy.stroke && element.setAttribute('stroke', proxy.stroke)
        }
      })

      // propagate
      beforeInjection && beforeInjection(svg)
    }
  }

  const handleAfterInjection = () => {
    if (svgState) {
      dispatch(SVGInjected({path: svgState.path, DOMId: svgState.DOMid}))
      afterInjection && afterInjection()
    }
  }

  return <>
    <ReactSVG
      src={objURL}
      beforeInjection={handleBeforeInjection}
      afterInjection={handleAfterInjection}
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

export default React.memo(SVGViewer)