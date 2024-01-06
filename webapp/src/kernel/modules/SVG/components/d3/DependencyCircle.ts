import {
  BaseType,
  ScaleLinear,
  Selection,
  curveBundle,
  pie as d3Pie,
  arc as d3Arc,
  scaleLinear,
  scaleOrdinal,
  schemeCategory10,
  ScaleOrdinal,
  select,
  PieArcDatum,
  Arc,
  DefaultArcObject,
  line as d3Line,
} from "d3";
import { sum } from "lodash";
import { D3Component, D3Graph, D3Link, D3Node } from "../../interfaces";

type Theme = "dark" | "light";

type IndexedN<N = any> = N & { idx: number; offset: number };
type DependencyCircle<D = D3Graph, N extends D3Node = D3Node, L = D3Link> = {
  innerRadius(): number;
  innerRadius(value: number): DependencyCircle<D, N, L>;

  groupBy(): string;
  groupBy(value: string): DependencyCircle<D, N, L>;

  graph(): D3Graph;
  graph(graph: (data: D) => D3Graph): DependencyCircle<D, N, L>;

  theme(): Theme;
  theme(value: Theme): DependencyCircle<D, N, L>;

  filterNode(value: (n: N) => boolean): DependencyCircle<D, N, L>;
  filterLink(value: (l: L) => boolean): DependencyCircle<D, N, L>;

  renderNode(
    value: (
      selection: Selection<any, N, any, D>,
      scale: ScaleLinear<number, number, never>,
      colors: ScaleOrdinal<string, unknown, never>
    ) => void
  ): DependencyCircle<D, N, L>;
  renderLink(
    value: (
      selection: Selection<any, L, any, D>,
      scale: ScaleLinear<number, number, never>,
      colors: ScaleOrdinal<string, unknown, never>
    ) => void
  ): DependencyCircle<D, N, L>;
  renderGroup(
    value: (
      selection: Selection<BaseType, unknown, HTMLElement, any>,
      group: {
        id: string;
        name: string;
        nodes: IndexedN<N>[];
        size: number;
      },
      segment: PieArcDatum<
        | number
        | {
            valueOf(): number;
          }
      >,
      colors: ScaleOrdinal<string, unknown, never>,
      arc: Arc<any, DefaultArcObject>,
      innerRadius: number,
      outerRadius: number
    ) => void
  ): DependencyCircle<D, N, L>;

  build(): D3Component<D>;
};

export default <
  D = D3Graph,
  N extends D3Node = D3Node,
  L extends D3Link = D3Link
>(): DependencyCircle<D, N, L> => {
  let _innerRadius = 50;
  let _outerRadius = 52;
  let _groupBy = "group";
  let _graph = (d: D) => d as D3Graph<N, L>; // by default assumes that the data is the graph.
  let _theme = "dark" as Theme;

  let filterNode = (n: N): boolean => !!n;
  let filterLink = (l: L): boolean => !!l;
  let renderNode = (
    selection: Selection<
      SVGGElement | BaseType,
      IndexedN,
      SVGGElement | BaseType,
      any
    >,
    scale: ScaleLinear<number, number, never>,
    colors: ScaleOrdinal<string, unknown, never>
  ) => {
    selection
      .append("text")
      .text((d) => d.nodeLabel)
      // @ts-ignore TODO: fix typing
      .attr("fill", (d) => colors(d.group))
      .attr("text-anchor", "middle");
  };

  let renderGroup = (
    selection: Selection<BaseType, unknown, HTMLElement, any>,
    group: {
      id?: string;
      name: string;
      nodes: IndexedN<N>[];
      size: number;
    },
    segment: PieArcDatum<
      | number
      | {
          valueOf(): number;
        }
    >,
    colors: ScaleOrdinal<string, unknown, never>,
    arc: Arc<any, DefaultArcObject>,
    innerRadius: number,
    outerRadius: number
  ) => {
    selection
      .selectAll("path")
      .data([group])
      .join("path")
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
      // @ts-ignore TODO: fix typing
      .attr("fill", (d) => colors(d.name))
      .attr("text-anchor", (d, i) =>
        (segment.endAngle + segment.startAngle) / 2 > Math.PI ? "end" : "start"
      )
      .attr("transform", (d, i) => {
        // @ts-ignore TODO: fix typing
        const [x, y] = arc.centroid(segment);
        const h = Math.sqrt(x * x + y * y);

        return `translate(${(x / h) * _innerRadius * 1.3}, ${
          (y / h) * _innerRadius * 1.3
        })`;
      });
  };

  let renderLink = (
    selection: Selection<
      BaseType | SVGGElement,
      L & { sourceOffset: number; targetOffset: number },
      SVGGElement | BaseType,
      number
    >,
    scale: ScaleLinear<number, number, never>,
    colors: ScaleOrdinal<string, unknown, never>
  ) => {
    const line = d3Line().curve(curveBundle.beta(0.35));

    selection
      .append("path")
      .attr("data-source", (d) => d.source)
      .attr("data-target", (d) => d.target)
      .attr("d", (d) =>
        line([
          [
            (_innerRadius - 10) * Math.sin(scale(d.sourceOffset)),
            (_innerRadius - 10) * -Math.cos(scale(d.sourceOffset)),
          ],
          [0, 0],
          [
            (_innerRadius - 10) * Math.sin(scale(d.targetOffset)),
            (_innerRadius - 10) * -Math.cos(scale(d.targetOffset)),
          ],
        ])
      )
      .attr("fill", "none")
      .attr("stroke-width", 5)
      .attr("stroke", "url(#convertion-gradient)");
  };

  function chart(
    root: Selection<SVGSVGElement, D, any, any>,
    selection: Selection<SVGElement, D, any, any>,
    data: D
  ) {
    root
      .selectAll("defs")
      .data([1])
      .join((enter) => {
        let linearGradient = enter
          .append("defs")
          .append("linearGradient")
          .attr("id", "convertion-gradient")
          .attr("x1", "0%")
          .attr("x2", "100%")
          .attr("y1", "0%")
          .attr("y2", "0%");

        const colors = [
          { color: "steelblue", offset: "0%" },
          { color: "red", offset: "100%" },
        ];
        linearGradient
          .selectAll("stop")
          .data(colors)
          .join("stop")
          .attr("stop-color", (d) => d.color)
          .attr("offset", (d) => d.offset);

        return linearGradient;
      });

    const container = selection
      .selectAll(".dependency-circle")
      .data([1])
      .join("g")
      .attr("class", "dependency-circle");

    const g = _graph(data);
    const nodes = g.nodes
      // @ts-ignore TODO: fix typing
      .filter(filterNode);
    nodes.sort((a, b) => (a.group.name >= b.group.name ? -1 : 1));

    const links = g.links.filter(filterLink);

    // separate nodes per group
    const groups = nodes.reduce(
      (acc, n, i) =>
        n.group.name in acc
          ? {
              ...acc,
              [n.group.name]: {
                id: n.group.id,
                name: n.group.name,
                nodes: [
                  ...acc[n.group.name].nodes,
                  { ...n, idx: i, offset: 0 } as IndexedN<N>,
                ],
              },
            }
          : {
              ...acc,
              [n.group.name]: {
                id: n.group.id,
                name: n.group.name,
                nodes: [{ ...n, idx: i, offset: 0 } as IndexedN<N>],
              },
            },
      {} as { [group: string]: {id?:string, name: string, nodes: IndexedN<N>[] } }
    );
    console.log(groups)

    const groupsArr = Object.entries(groups).map(([name, g]) => ({
      id: g.id,
      name: name,
      nodes: g.nodes,
      size: g.nodes.length,
    }));

    const colors = scaleOrdinal()
      .domain(Object.keys(groups))
      .range(schemeCategory10);
    const scale = scaleLinear()
      .domain([0, nodes.length])
      .range([0, 2 * Math.PI]);

    const pie = d3Pie();
    const sizes = groupsArr.map(({ size }) => size);
    const pieSegments = pie(sizes);

    const arc = d3Arc()
      .innerRadius(_innerRadius * 1.1)
      .outerRadius(_innerRadius * 1.2)
      .startAngle((d) => d.startAngle)
      .endAngle((d) => d.endAngle);

    const linksWrapper = container
      .selectAll(".links")
      .data([1])
      .join("g")
      .attr("class", "links");

    const groupsWrapper = container
      .selectAll(".groups")
      .data([1])
      .join("g")
      .attr("class", "groups");

    const groupsContainer = groupsWrapper
      .selectAll(".group")
      .data(groupsArr)
      .join("g")
      .attr("id", (d) => d.id ?? "other")
      .attr("class", "group");

    pieSegments.forEach((segment, i) => {
      const offsetCounter = sum(
        pieSegments
          .filter((s, idx) => s.index < segment.index)
          .map((s) => s.value)
      );
      const group = groupsArr[i];
      const groupContainer = select(`#${group.id}`).call(
        renderGroup,
        group,
        segment,
        colors,
        arc,
        _innerRadius,
        _outerRadius
      );

      const nodesContainer = groupContainer
        .selectAll(".nodes-container")
        .data([group])
        .join("g")
        .attr("class", "nodes-container");

      nodesContainer
        .selectAll(".node")
        .data(group.nodes)
        .join("g")
        .attr("class", "node")
        .attr("id", (d) => d.id)
        .attr("data-offset", (d, i) => offsetCounter + i)
        .attr("transform", (d, i) => {
          return `translate(${
            _innerRadius * Math.sin(scale(offsetCounter + i))
          }, ${_innerRadius * -Math.cos(scale(offsetCounter + i))}) `;
          //rotate(${(360 / scale.domain().length) * i})
        })
        .call(renderNode, scale, colors);
    });

    linksWrapper
      .selectAll(".link")
      .data(
        links.map((l) => {
          const source = container.select(`#${l.source}`);
          const target = container.select(`#${l.target}`);
          return {
            ...l,
            sourceOffset: +source.attr("data-offset"),
            targetOffset: +target.attr("data-offset"),
          };
        })
      )
      .join(
        "g",
        (update) => {
          update.select("*").remove();
          return update;
        },
        (exit) => exit.remove()
      )
      .attr("class", "link")
      .attr("id", (d) => d.id)
      .call(renderLink, scale, colors);
  }

  chart.innerRadius = (value: number) =>
    value ? ((_innerRadius = value), chart) : _innerRadius;
  chart.groupBy = (value: string) =>
    value ? ((_groupBy = value), chart) : _groupBy;
  chart.graph = (value: (data: D) => D3Graph<N, L>) =>
    value ? ((_graph = value), chart) : _graph;
  chart.theme = (value: Theme) => (value ? ((_theme = value), chart) : _theme);
  chart.renderNode = (
    value: (
      selection: Selection<SVGGElement | BaseType, IndexedN<N>, SVGGElement, D>,
      scale: ScaleLinear<number, number, never>
    ) => void
    // @ts-ignore TODO: fix typing
  ) => ((renderNode = value), chart);
  chart.renderLink = (
    value: (
      selection: Selection<SVGGElement | BaseType, IndexedN<N>, SVGGElement, D>,
      scale: ScaleLinear<number, number, never>
    ) => void
    // @ts-ignore TODO: fix typing
  ) => ((renderLink = value), chart);
  chart.renderGroup = (
    value: (
      selection: Selection<BaseType, unknown, HTMLElement, any>,
      group: {
        id: string;
        name: string;
        nodes: IndexedN<N>[];
        size: number;
      },
      segment: PieArcDatum<
        | number
        | {
            valueOf(): number;
          }
      >,
      colors: ScaleOrdinal<string, unknown, never>,
      arc: Arc<any, DefaultArcObject>,
      innerRadius: number,
      outerRadius: number
    ) => void
    // @ts-ignore TODO: fix typing
  ) => ((renderGroup = value), chart);

  chart.filterNode = (value: (n: N) => boolean) => (
    // @ts-ignore TODO: fix typing
    (filterNode = value), chart
  );
  chart.filterLink = (value: (l: L) => boolean) => (
    // @ts-ignore TODO: fix typing
    (filterLink = value), chart
  );
  chart.build = chart;

  // @ts-ignore TODO: fix typing
  return chart as DependencyCircle<D>;
};
