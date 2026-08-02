import { Selection } from "d3";
import type { Theme } from "@mui/material";
import type { GarmentNode, VariationGraphState } from "../../../../typings";

// Rendered outside React, so the theme is passed in — no literal colors here.
export default function D3GarmentNode(
  selection: Selection<SVGGElement, any, any, any>,
  node: GarmentNode,
  graph: VariationGraphState,
  theme: Theme
) {
  const width = 120;
  const height = 60;
  const borderRadius = 16;
  const topBarHeight = 22;

  const group = selection
    .append("g")
    .attr("class", "garment-node")
    .style("cursor", "pointer")
    .style("pointer-events", "all");

  // Main rounded square
  group.append("rect")
    .attr("x", -width / 2)
    .attr("y", -height / 2)
    .attr("width", width)
    .attr("height", height)
    .attr("rx", borderRadius)
    .attr("ry", borderRadius)
    .attr("fill", theme.palette.background.paper)
    .attr("stroke", theme.palette.divider)
    .attr("stroke-width", 2)
    .attr("style", "padding: 8px");

  // Top bar with only top corners rounded
  const x = -width / 2;
  const y = -height / 2;
  const w = width;
  const h = topBarHeight;
  const r = borderRadius;
  // SVG path for top bar: only top corners rounded
  const topBarPath = `M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r} V${y+h} H${x} V${y+r} Q${x},${y} ${x+r},${y} Z`;
  group.append("path")
    .attr("d", topBarPath)
    .attr("fill", theme.palette.primary.main);

  // Node label in top bar
  group.append("text")
    .text(node.label)
    .attr("x", 0)
    .attr("y", -height / 2 + topBarHeight / 2 + 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", theme.palette.primary.contrastText)
    .attr("font-size", 14)
    .attr("font-weight", "bold")
    

}
