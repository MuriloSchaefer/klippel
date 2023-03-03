import { BeforeEach } from "@tanem/svg-injector";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import React, { useCallback, useMemo } from "react";
import { ReactSVG } from "react-svg";
import { selectSVGState } from "../store/selectors";
import { Box } from "@mui/material";

type A4cm = [21, 29.7];
interface SVGViewerPreferences {
  layout?: {
    showRulers?: {
      unit: "px" | "mm" | "cm" | "mt";
      x: boolean;
      y: boolean;
    };
    gridLines?: {
      unit: "px" | "mm" | "cm" | "mt";
      size: [number, number];
    };
  };
}
interface SVGViewerProps {
  path: string;
  beforeInjection?: BeforeEach;
  preferences?: SVGViewerPreferences;
}

const SVGViewer = ({ path, beforeInjection, preferences }: SVGViewerProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const svgState = useAppSelector(selectSVGState(path));

  const handleZoom = (
    svg: SVGSVGElement,
    delta: number,
    center: [number, number]
  ) => {
    console.group('zoom')
    const originalViewbox = svg.viewBox;

    // invert op
    center[0] = delta < 0 ? -center[0] : center[0]
    center[1] = delta < 1 ? -center[1] : center[1]
    const nextViewbox = `
    ${originalViewbox.baseVal.x } 
    ${originalViewbox.baseVal.y } 
    ${originalViewbox.baseVal.width + delta*5} 
    ${originalViewbox.baseVal.height}`;

    svg.setAttribute("viewBox", nextViewbox);

    console.groupEnd()
  };

  const handleBeforeInjection = useCallback(
    (svg: SVGSVGElement) => {
      // TODO: inject proxies here
      svg.setAttribute("id", `${path}-root`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");

      // set zoom and pam
      // TODO: make event configurable (mouse commands should be configurable)
      // QUESTION: how to handle pen / multi-touch events (on tablet)

      svg.addEventListener("wheel", (e: WheelEvent) => {
        handleZoom(svg, e.deltaY, [e.x, e.y]);
      });
      // svg.setAttribute("height", `100%`);
      // svg.setAttribute("viewBox", `100%`);

      Object.entries(svgState?.proxies ?? {}).forEach(([id, styles]) => {
        const elem = svg.getElementById(id) as SVGSVGElement;
        if (elem) {
          if ('fill' in styles)
            elem.setAttribute("fill", styles.fill!);

          if ('stroke' in styles)
            elem.setAttribute("stroke", styles.stroke!);
        }
      });

      if (beforeInjection) beforeInjection(svg);
    },
    [beforeInjection, svgState?.content]
  );

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
    <Box
      role="svg-viewport"
      id={path}
      aria-label="SVG viewer"
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "top",
        justifyContent: "center",
      }}
    >
      <ReactSVG
        style={{
          width: "100%",
          overflow: "hidden",
          height: "100%",
        }}
        src={objURL}
        height="100%"
        width="100%"
        beforeInjection={handleBeforeInjection}
      />
    </Box>
  );
};

export default SVGViewer;
