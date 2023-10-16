import { Selection, axisBottom, axisRight, scaleLinear, zoom } from "d3";

type AxisSettings = {
  range: number[];
  domain: number[];
};

type GridProps = {
  xSettings: AxisSettings;
  ySettings: AxisSettings;
  dimensions: [number, number];
};

export default <D = any>({
  xSettings,
  ySettings,
  dimensions: [width, height],
}: GridProps) => {
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

  return (
    root: Selection<SVGSVGElement, D, any, any>,
    selection: Selection<SVGElement, D, any, any>
  ) => {
    const gridGroup = selection.append("g").attr("role", "grid");
    const contentGroup = root.select('#content')
    const overlaysGroup = root.select('#overlays');

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
      // .translateExtent([
      //   [-100, -100],
      //   [dimensions.width + 200, dimensions.height + 200],
      // ])
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
    // @ts-ignore TODO: fix typing
    root.call(zoomFunc);
  };
};
