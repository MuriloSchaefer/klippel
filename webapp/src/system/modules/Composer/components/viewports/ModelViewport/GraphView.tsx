import {  useRef, useLayoutEffect } from "react";
import { useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import {
  GarmentNode,
  PartNode,
  HasPartEdge,
  VariationGraphState,
} from "../../../typings";
import { D3Graph, D3Link } from "@kernel/modules/SVG/interfaces";
import D3GarmentNode from "./d3Components/d3GarmentNode";

type D3VariationGraphData = D3Graph<
  GarmentNode | PartNode,
  HasPartEdge & D3Link
>;
export default function GraphView({ variationId }: Readonly<{ variationId: string }>) {
  const {
    algorithms: {
      search: { bfs },
    },
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");
  const {
    hooks: { useD3Container },
    d3Components: { Grid },
  } = useModule<ISVGModule>("SVG");

  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);

  // Get the graph for the current variation
  const graph = useGraph<VariationGraphState>(variationId);

  // Render with d3 grid
  const width = dimensions?.width ?? 700;
  const height = dimensions?.height ?? 700;
  const container = useD3Container<{graph:VariationGraphState}>()
    .width(width)
    .height(height)
    .underlays([
      Grid<D3VariationGraphData>({
        xSettings: { range: [-1, width + 1], domain: [-1, width + 1] },
        ySettings: { range: [-1, height + 1], domain: [-1, height + 1] },
        dimensions: [width, height],
      }).transformZoom((root, zoomFunc) => {
        zoomFunc.translateBy(root, width / 2, height / 2);
      }).build,
    ])
    .content([
      (root, selection, {graph}) => {
        // Build SVG for graph
        const svgRoot = selection
          .append("g")
          .attr("id", "graph-content");
        const nodesGroup = svgRoot.append('g').attr("id", "nodes");
        svgRoot.append('g').attr("id", "links");
        svgRoot.append('g').attr("id", "unreachable-nodes");
        // Render nodes
        bfs(
          graph,
          "garment", // starting node id
          (node) => { // process each node
            console.log("Processing node:", node);
            D3GarmentNode(nodesGroup, node as GarmentNode, graph, theme);
            return true
          },
          (node) => false, // stop condition never met. Traverse all nodes
          3 // depth limit
        );
      },
    ]);

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current) return;
    container.render({graph: graph.state!}, svgRef.current);
  }, [container, dimensions]);

  if (!graph.state) return <div>Carregando...</div>;

  return (
    <div ref={wrapperRef} style={{ height: "100%", width: "100%" }}>
      <svg ref={svgRef} id={`${graph.id}`} width="100%" height="100%" />
    </div>
  );
}
