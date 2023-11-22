import {
  Selection,
  arc,
  chord,
  descending,
  interpolateRainbow,
  quantize,
  ribbonArrow,
} from "d3";

type Matrix = {matrix: number[][], names: string[]};

type ChordPlotProps<D> = {
  dataTransform: (data: D) => Matrix;
};

export default <D = any>({ dataTransform }: ChordPlotProps<D>) => {
  return (
    root: Selection<SVGSVGElement, D, any, any>,
    selection: Selection<SVGElement, D, any, any>,
    data: D
  ) => {
    const innerRadius = 200;
    const outerRadius = 210;
    const {matrix, names} = dataTransform(data);
    const arcGen = arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const gen = chord()
      .padAngle(5 / innerRadius)
      .sortSubgroups(descending);
    const d = gen(matrix);
    const colors = quantize(interpolateRainbow, names.length+1);

    const ribbonGenerator = ribbonArrow()
      .radius(innerRadius - 1)
      .padAngle(1 / innerRadius);

    const container = selection.append("g").attr("id", "chord-plot");
    const groupsContainer = container
      .append("g")
      .attr("role", "groups-container");
    const chordsContainer = container
      .append("g")
      .attr("role", "chords-container")
      .attr("fill-opacity", 0.75);

    const group = groupsContainer
      .selectAll()
      .data(d.groups)
      .join("g")
      .attr("id", (d) => names[d.index]);

    group
      .append("path")
      .attr("fill", (d) => colors[d.index])
      .attr("d", <any>arcGen);

    group
      .append("text")
      .attr("dy", "0.35em")
      .attr(
        "transform",
        (d) => `
        rotate(${(((d.startAngle + d.endAngle) / 2) * 180) / Math.PI - 90})
        translate(${outerRadius + 5})
        ${(d.startAngle + d.endAngle) / 2 > Math.PI ? "rotate(180)" : ""}
      `
      )
      .attr("text-anchor", (d) =>
        (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : null
      )
      .text((d) => names[d.index])
      .attr("fill", "white");

    chordsContainer
      .selectAll()
      .data(d)
      .join("path")
      .style("mix-blend-mode", "add")
      .attr("fill", (d) => colors[d.target.index])
      .attr("d", <any>ribbonGenerator)
      .append("title")
      .text(
        (d) =>
          `${names[d.source.index]} → ${names[d.target.index]} ${
            d.source.value
          }`
      );

    // .selectAll('path')
    // .data(d)
    // .join('path')
    // .attr('d', ribbonGenerator)
  };
};
