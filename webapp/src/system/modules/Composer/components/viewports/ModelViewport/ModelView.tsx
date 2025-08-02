import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { ISVGModule } from "@kernel/modules/SVG";
import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";

export default function ModelView() {
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");

  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const {
    hooks: { useD3Container },
    d3Components: { Grid },
  } = useModule<ISVGModule>("SVG");

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);

  const theme = useTheme();
  const [shallTranslate, setShallTranslate] = useState(true);
  const [width, height] = [dimensions?.width ?? 700, dimensions?.height ?? 700];

  const container = useD3Container<any>()
    .width(width)
    .height(height)
    .underlays([
      Grid<any>({
        xSettings: { range: [-1, width + 1], domain: [-1, width + 1] },
        ySettings: { range: [-1, height + 1], domain: [-1, height + 1] },
        dimensions: [width, height],
      }).transformZoom((root, zoomFunc) => {
        if (shallTranslate) {
          // @ts-ignore TODO: fix typing
          zoomFunc.translateBy(root, width / 2, height / 2);
          setShallTranslate(false);
        }
      }).build,
    ])

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current) return;
    container.render(null, svgRef.current);
  }, [ dimensions]);

  return (
    <div
      ref={wrapperRef}
      role="conversion-graph-viewer"
      style={{ height: "100%", width: "100%" }}
    >
      <svg ref={svgRef} id={`qwrtt`} width="100%" height="100%" />
    </div>
  );
}
