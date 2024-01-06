import {
  Selection,
  Simulation,
  axisBottom,
  axisRight,
  drag,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  scaleLinear,
  select,
  zoom,
} from "d3";
import { D3Graph, D3Link, D3Node } from "@kernel/modules/SVG/interfaces";

import stringToColor from "../utils/str2color";

interface GraphEditorProps {
  nodeBorder: string;
  width: number;
  height: number;
}

interface GraphEditor {
  render(graph: D3Graph, svg: SVGSVGElement): void;
}

export const useGraphEditor = ({
  width,
  height,
  nodeBorder,
}: GraphEditorProps): GraphEditor => {
  const x = scaleLinear()
    .domain([-1, width + 1])
    .range([-1, width + 1]);

  const y = scaleLinear()
    .domain([-1, height + 1])
    .range([-1, height + 1]);

  const xAxis = axisBottom(x)
    .ticks(((width + 2) / (height + 2)) * 10)
    .tickSize(height)
    .tickPadding(8 - height);

  const yAxis = axisRight(y)
    .ticks(10)
    .tickSize(width)
    .tickPadding(8 - width);

  function drawNode(
    selection: Selection<SVGGElement, D3Node, SVGGElement, D3Graph>
  ) {
    //circle
    selection
      .append("circle")
      .attr("r", (n) => n.radius)
      .attr("fill", (n) => stringToColor(n.group.name ?? ""))
      .attr("stroke", nodeBorder);

    // label
    selection
      .append("text")
      .text((n) => n.nodeLabel)
      .attr("text-anchor", "middle")
      .attr("fill", nodeBorder);
  }

  function addDrag(simulation: Simulation<any, any>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return drag<SVGGElement, D3Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  function drawLink(
    selection: Selection<SVGGElement, D3Link, SVGGElement, D3Graph>
  ) {
    //circle
    selection.append("line").attr("stroke-width", "1em").attr("stroke", "gray");
  }

  function render(svg: Selection<SVGSVGElement, D3Graph, null, undefined>) {
    svg.each((graph) => {
      svg
        .attr("viewBox", [0,0, width, height])

      // clear all previous content on refresh
      // QUESTION: is there a better way?
      const everything = svg.selectAll("*");
      everything.remove();

      const defs = svg.append("defs");
      const gridGroup = svg.append("g").attr("role", "grid");
      const graphContainer = svg.append("g").attr("role", "container");

      // Add grid
      const gX = gridGroup
        .append("g")
        .attr("class", "axis axis--x")
        .attr("stroke-opacity", "0.3")
        .attr("stroke-dasharray", "6 1")
        .attr("stroke-width", "0.5px")
        .call(xAxis);
      const gY = gridGroup
        .append("g")
        .attr("class", "axis axis--y")
        .attr("stroke-opacity", "0.3")
        .attr("stroke-dasharray", "6 1")
        .attr("stroke-width", "0.5px")
        .call(yAxis);

      // add zoom
      const zoomFunc = zoom<Element, D3Graph>()
        .scaleExtent([-10, 40])
        // .translateExtent([
        //   [-100, -100],
        //   [dimensions.width + 200, dimensions.height + 200],
        // ])
        .filter((event) => {
          event.preventDefault();
          return (!event.ctrlKey || event.type === "wheel") && !event.button;
        })
        .on("zoom", ({ transform }) => {
          graphContainer.attr("transform", transform);
          gX.call(xAxis.scale(transform.rescaleX(x)));
          gY.call(yAxis.scale(transform.rescaleY(y)));
        });
      // @ts-ignore TODO: fix typing
      svg.call(zoomFunc);

      // add graph
      const simulation = forceSimulation(graph.nodes)
        .force(
          "links",
          forceLink<D3Node, D3Link>(graph.links)
            .id((d) => d.id)
            .distance(300)
            .strength(1)
        )
        .force(
          "charge",
          forceManyBody<D3Node>().strength((n) => n.strength)
        )
        .force(
          "colide",
          forceCollide((n) => n.radius)
        );
      // .force(
      //   "center",
      //   forceCenter(dimensions.width / 2, dimensions.height / 2)
      // );

      const links = graphContainer
        .append("g")
        .attr("role", "layer")
        .attr("id", "links-layer")
        .selectAll("g[role='link']")
        .data(graph.links)
        .join(
          (enter) =>
            enter
              .append("g")
              .attr("role", "link")
              .attr("id", (l) => l.id)
              .call(drawLink),
          (update) => update,
          (exit) => exit.remove()
        );

      const nodes = graphContainer
        .append("g")
        .attr("role", "layer")
        .attr("id", "nodes-layer")
        .selectAll("g[role='node']")
        .data(graph.nodes)
        .join(
          (enter) =>
            enter
              .append("g")
              .attr("role", "node")
              .attr("id", (n) => n.id)
              .call(addDrag(simulation))
              .call(drawNode),
          (update) =>
            update
              .select("circle")
              .attr("cx", (n) => n.x)
              .attr("cy", (n) => n.y),
          (exit) => exit.remove()
        );
      // @ts-ignore TODO: fix typing on addDrag
      //.call(addDrag(simulation));

      simulation.on("tick", () => {
        nodes.attr("transform", (n) => `translate(${n.x}, ${n.y})`);

        links
          .selectAll("line")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
      });
      simulation.alpha(1);
    });
  }
  return {
    render(graph, svg) {
      select(svg).datum(graph).call(render);
    },
  };
};
