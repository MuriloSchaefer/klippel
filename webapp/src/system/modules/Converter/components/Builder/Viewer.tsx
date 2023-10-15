import React, { useLayoutEffect, useMemo, useRef } from "react";

import { Theme, useTheme } from "@mui/material/styles";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import { D3Graph } from "@kernel/modules/SVG/interfaces";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ConversionGraph } from "../../typings";

type D3ConversionGraphData = { graph: D3Graph; theme: Theme }

const Viewer = ({ graphId }: { graphId: string }) => {
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

  const graph = useGraph<ConversionGraph, ConversionGraph>(
    graphId,
    (g) => g as ConversionGraph
  );

  const adaptedGraph: D3Graph = useMemo(() => {
    if (!graph.state || !graph.state.nodes)
      return {
        nodes: [],
        links: [],
      };

    return {
      nodes: Object.values(graph.state.nodes).map((n) => ({
        id: n.id,
        group: n.type,
        nodeLabel: n.name,
        strength: -400,
        x: n.position.x,
        y: n.position.y,
        radius: 50,
      })),
      links: Object.values(graph.state.edges).map((e) => ({
        id: e.id,
        type: e.type,
        source: e.sourceId,
        target: e.targetId,
        value: 5,
      })),
    };
  }, [graph]);

  const theme = useTheme();

  const [width, height] = [dimensions?.width ?? 700, dimensions?.height ?? 700]

  const container = useD3Container<D3ConversionGraphData>()
    .width(width)
    .height(height)
    .underlays([
      Grid<D3ConversionGraphData>({
        xSettings: { range: [-1, width + 1], domain: [-1, width + 1] },
        ySettings: { range: [-1, height + 1], domain: [-1, height + 1] },
        dimensions: [width, height]
      }),
    ])

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current) return;
    container.render({ graph: adaptedGraph, theme }, svgRef.current);
  }, [adaptedGraph, dimensions]);

  if (!graph.state) return <></>; // TODO: add loading

  return (
    <div
      ref={wrapperRef}
      role="conversion-graph-viewer"
      style={{ height: "100%", width: "100%" }}
    >
      <svg ref={svgRef} id={`${graph.id}`} width="100%" height="100%" />
    </div>
  );
};

export default React.memo(Viewer);
