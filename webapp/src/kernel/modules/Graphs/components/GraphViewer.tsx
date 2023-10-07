import React, { useLayoutEffect, useMemo, useRef } from "react";

import useGraph from "../hooks/useGraph";
import { useGraphEditor } from "../hooks/useGraphEditor";
import { D3Graph } from "../interfaces";
import { useTheme } from "@mui/material/styles";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";

const GraphViewer = ({ graphId }: { graphId: string }) => {
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);

  const graph = useGraph(graphId, (g) => g);

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
        nodeLabel: n?.label || n.id,
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
  const graphEditor = useGraphEditor({
    nodeBorder: theme.palette.getContrastText(theme.palette.background.default),
    width: dimensions?.width ?? 0,
    height: dimensions?.height ?? 0,
  });

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current) return;

    graphEditor.render(adaptedGraph, svgRef.current);
  }, [adaptedGraph, dimensions]);

  if (!graph.state) return <></>; // TODO: add loading

  return (
    <div
      ref={wrapperRef}
      role="graph-viewer"
      style={{ height: "100%", width: "100%" }}
    >
      <svg ref={svgRef} id={`${graph.id}`} width="100%" height="100%" />
    </div>
  );
};

export default React.memo(GraphViewer);
