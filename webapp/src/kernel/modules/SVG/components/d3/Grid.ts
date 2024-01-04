import {
  Selection,
  ZoomBehavior,
  axisBottom,
  axisRight,
  scaleLinear,
  zoom,
} from "d3";
import { D3Component } from "../../interfaces";

type AxisSettings = {
  range: number[];
  domain: number[];
};

type GridProps = {
  xSettings: AxisSettings;
  ySettings: AxisSettings;
  dimensions: [number, number];
};

type Grid<D = any> = {
  transformZoom(
    value: (
      root: Selection<SVGSVGElement, D, any, any>,
      zoomFunc: ZoomBehavior<Element, D>
    ) => void
  ): Grid<D>;

  build(): D3Component<D>;
};

export default <D = any>({
  xSettings,
  ySettings,
  dimensions: [width, height],
}: GridProps): Grid<D> => {
  const x = scaleLinear().domain(xSettings.domain).range(xSettings.range);

  const y = scaleLinear().domain(ySettings.domain).range(ySettings.range);

  const xAxis = axisBottom(x)
    .ticks(((width + 2) / (height + 2)) * 10)
    .tickSize(height)
    .tickPadding(8 - height);

  const yAxis = axisRight(y)
    .ticks(10)
    .tickSize(width)
    .tickPadding(8 - width);

  let _startCentered = true;

  let _transformZoom = (
    root: Selection<SVGSVGElement, D, any, any>,
    zoomFunc: ZoomBehavior<Element, D>
  ) => {
    // zoomFunc.translateBy(root, width/2, height/2)
  };

  function chart(
    root: Selection<SVGSVGElement, D, any, any>,
    selection: Selection<SVGElement, D, any, any>,
    data: D
  ) {
    const gridGroup = selection
      .selectAll("g")
      .data([1])
      .join("g")
      .attr("role", "grid");
    const contentGroup = root.select("#content");
    const overlaysGroup = root.select("#overlays");

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
    const zoomFunc = zoom<Element, D>()
      .scaleExtent([-10, 40])
      .filter((event) => {
        event.preventDefault();
        return (!event.ctrlKey || event.type === "wheel") && !event.button;
      })
      .on("zoom", ({ transform }) => {
        contentGroup.attr("transform", transform);
        overlaysGroup.attr("transform", transform);
        gX.call(xAxis.scale(transform.rescaleX(x)));
        gY.call(yAxis.scale(transform.rescaleY(y)));
      });

      _transformZoom(root, zoomFunc);

    // @ts-ignore TODO: fix typing
    root.call(zoomFunc);
  }

  chart.transformZoom = (
    value: (
      root: Selection<SVGSVGElement, D, any, any>,
      zoomFunc: ZoomBehavior<Element, D>
    ) => void
  ) => ((_transformZoom = value), chart);
  chart.build = chart as D3Component<D>;

  // @ts-ignore TODO: fix typing
  return chart as Grid<D>;
};
