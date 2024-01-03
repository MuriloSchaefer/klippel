import React, {
  PointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useTheme } from "@mui/material/styles";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import { D3Graph } from "@kernel/modules/SVG/interfaces";
import { IGraphModule } from "@kernel/modules/Graphs";
import {
  ConversionGraph,
  ConversionNodes,
  ConvertionEdges,
} from "../../typings";
import useConverterManager from "../../hooks/useConverterManager";

type D3ConversionGraphData = D3Graph & {
  nodes: ConversionNodes[];
  links: ConvertionEdges[];
};

const Viewer = ({ graphId }: { graphId: string }) => {
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");

  const {
    hooks: { useGraph },
  } = useModule<IGraphModule>("Graph");

  const {
    hooks: { useD3Container },
    d3Components: { Grid, DependencyCircle },
  } = useModule<ISVGModule>("SVG");

  const converterManager = useConverterManager((s) => s);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);

  const graph = useGraph<ConversionGraph, ConversionGraph>(
    graphId,
    (g) => g as ConversionGraph
  );

  const adaptedGraph: D3ConversionGraphData = useMemo(() => {
    if (!graph.state?.nodes) return { nodes: [], links: [] };

    const getGroup = (n: ConversionNodes): string => {
      if (!graph.state) return "Outros";
      const belongsTo = Object.values(graph.state.edges).find(
        (e) => e.sourceId === n.id && e.type === "BELONGS_TO"
      );
      if (belongsTo) return graph.state.nodes[belongsTo.targetId].name;
      return "Outros";
    };

    return {
      nodes: Object.values(graph.state.nodes).map((n) => ({
        ...n,
        nodeLabel: "abbreviation" in n ? n.abbreviation : n.name,
        group: getGroup(n),
        radius: 5,
        strength: 10,
        x: n.position.x,
        y: n.position.y,
      })),
      links: Object.values(graph.state.edges).map((e) => ({
        ...e,
        source: e.sourceId,
        target: e.targetId,
      })),
    };
  }, [graph]);

  const theme = useTheme();
  const [shallTranslate, setShallTranslate] = useState(true);

  const [width, height] = [dimensions?.width ?? 700, dimensions?.height ?? 700];

  const handleUnitSelection = useCallback((id: string) => {
    converterManager.selectNode(id);
  }, []);

  const handleScaleSelection = useCallback((id: string) => {
    converterManager.selectNode(id);
  }, []);

  const container = useD3Container<D3ConversionGraphData>()
    .width(width)
    .height(height)
    .underlays([
      Grid<D3ConversionGraphData>({
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
    .content([
      DependencyCircle<D3ConversionGraphData, any, any>() // TODO: add typing for nodes and edges
        .innerRadius(Math.min(width, height) / 2 - 20)
        .filterNode((n) => n.type === "UNIT" || n.type === "COMPOUND_UNIT")
        .filterLink((l) => l.type === "CONVERTS_TO")
        .renderGroup((selection, group, segment, colors, arc, innerRadius) => {
          selection
            .selectAll("path")
            .data([group])
            .join("path")
            .attr("id", (d) => d.name)
            .on("click", (e) => handleScaleSelection(e.target.id))
            .attr("class", "group-arc")
            // @ts-ignore TODO: fix typing
            .attr("fill", (d) => colors(group.name))
            // @ts-ignore TODO: fix typing
            .attr("d", (d, i) => arc(segment));

          selection
            .selectAll("text")
            .data([group])
            .join("text")
            .attr("class", "group-text")
            .text((d) => d.name)
            .attr("id", (d) => d.name)
            .on("click", (e) => handleScaleSelection(e.target.id))
            // @ts-ignore TODO: fix typing
            .attr("fill", (d) => colors(d.name))
            .attr("text-anchor", (d, i) =>
              (segment.endAngle + segment.startAngle) / 2 > Math.PI
                ? "end"
                : "start"
            )
            .attr("transform", (d, i) => {
              // @ts-ignore TODO: fix typing
              const [x, y] = arc.centroid(segment);
              const h = Math.sqrt(x * x + y * y);

              return `translate(${(x / h) * innerRadius * 1.3}, ${
                (y / h) * innerRadius * 1.3
              })`;
            });
        })
        .renderNode((selection, scale, colors) => {
          selection
            .append("text")
            .text((d) => d.nodeLabel)
            // @ts-ignore TODO: fix typing
            .attr("fill", (d) =>
              converterManager.state?.selectedNode === d.id
                ? "white"
                : colors(d.group)
            )
            .attr("text-anchor", "middle")
            .on("pointerdown", (e: PointerEvent<SVGTextElement>, d) => {
              // @ts-ignore TODO: fix typing
              handleUnitSelection(d.id);
              e.stopPropagation();
            });
        })
        .theme(theme.palette.mode).build,
    ]);

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current) return;
    container.render(adaptedGraph, svgRef.current);
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
