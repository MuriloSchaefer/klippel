import { Selection, axisBottom, axisRight, scaleLinear } from "d3";

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

  return (selection: Selection<SVGElement, D, any, any>) => {
    const gridGroup = selection.append("g").attr("role", "grid");

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
  };
};
