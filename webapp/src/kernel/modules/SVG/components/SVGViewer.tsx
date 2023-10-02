import React, { PointerEvent, useCallback, useMemo } from "react";
import { ReactSVG } from "react-svg";
import { BeforeEach } from "@tanem/svg-injector";

import Box from "@mui/material/Box";

import { Store } from "@kernel/modules/Store";
import useModule from "@kernel/hooks/useModule";

import { selectSVGState } from "../store/selectors";

type A4cm = [21, 29.7];
interface SVGViewerProps {
  path: string;
  instanceName: string;
  beforeInjection?: BeforeEach;
}

// TODO: refactor to use D3 rather than ReactSVG, here is how to import svg in d3: 
/* ```ts
    d3.xml("maple_illustration.svg")
      .then(data => {
        d3.select("#svg-container").node().append(data.documentElement)
      });
    ```
*/

const SVGViewer = ({ path, instanceName, beforeInjection }: SVGViewerProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const svgState = useAppSelector(selectSVGState(path));


  const handleBeforeInjection = useCallback(
    (svg: SVGSVGElement) => {
      // TODO: inject proxies here
      svg.setAttribute("id", `${path}-root`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");

      // svg.setAttribute("viewBox", `100%`);
      if (instanceName) {
        const instance = svgState?.instances[instanceName];
        if (!instance) return;

        // TODO: fix zoom and panning
        // const currentViewBox = svg.getAttribute("viewBox");
        // if (currentViewBox) {
        //   const [minX, minY, width, height] = currentViewBox
        //     .split(" ")
        //     .map((value) => Number(value));
        //   const newViewBox = `${minX + instance.pan[0]} ${
        //     minY + instance.pan[1]
        //   } ${width / instance.zoom} ${height / instance.zoom}`;
        //   svg.setAttribute("viewBox", newViewBox);
        // }

        Object.entries(svgState?.instances[instanceName].proxies ?? {}).forEach(
          ([id, styles]) => {
            const elem = svg.getElementById(id) as SVGSVGElement;
            if (elem) {
              if ("fill" in styles)
                elem.setAttribute("fill", styles.fill as string);

              if ("stroke" in styles)
                elem.setAttribute("stroke", styles.stroke as string);
            }
          }
        );
      }

      if (beforeInjection) beforeInjection(svg);
    },
    [
      beforeInjection,
      svgState?.content,
      instanceName,
      svgState?.instances[instanceName],
    ]
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
