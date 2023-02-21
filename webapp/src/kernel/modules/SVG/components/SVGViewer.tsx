import { BeforeEach } from '@tanem/svg-injector';
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import React, { useCallback, useMemo } from "react";
import { ReactSVG } from "react-svg";
import { selectSVGState } from "../store/selectors";

interface SVGViewerProps {
  path: string;
  beforeInjection?: BeforeEach
}

const SVGViewer = ({ path, beforeInjection }: SVGViewerProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const svgState = useAppSelector(selectSVGState(path));

  const handleBeforeInjection = useCallback((svg: SVGSVGElement)=> {
    // TODO: inject proxies here
    svg.setAttribute('id',`${path}-root`)

    Object.entries(svgState?.proxies ?? {}).forEach(([id, styles]) => {
      const elem = svg.getElementById(id) as SVGSVGElement
      if (elem){
        elem.setAttribute('class', "")
        elem.setAttribute('fill', styles.fill ?? "white")
        elem.setAttribute('stroke', styles.stroke ?? "black")
      }
    })

    if (beforeInjection) beforeInjection(svg)
  }, [beforeInjection, svgState?.content])

  const objURL = useMemo(
    () =>
      svgState?.content &&
      window.URL.createObjectURL(
        new Blob([svgState.content], { type: "image/svg+xml" })
      ),
    [svgState?.content]
  );
  if (!svgState || !objURL) return null;

  return (
      <ReactSVG
        src={objURL}
        beforeInjection={handleBeforeInjection}
        id={path}
        aria-label="SVG viewer"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "top",
          justifyContent: 'center'
        }}
      />
  );
};

export default React.memo(SVGViewer);
