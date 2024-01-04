import { Selection, select } from "d3";
import { D3Component } from "../interfaces";



type Underlay<D = any> = D3Component<D>;
type Content<D = any> = D3Component<D>;
type Overlay<D = any> = D3Component<D>;

type D3Container<D = any> = {
  width(value: number): D3Container<D>;
  width(): number;

  height(): number;
  height(value: number): D3Container<D>;

  underlays(): any[];
  underlays(value: Underlay<D>[]): D3Container<D>;

  content(): any[];
  content(value: Content<D>[]): D3Container<D>;

  overlays(): any[];
  overlays(value: Overlay<D>[]): D3Container<D>;

  render(datum: D, svgRef: SVGSVGElement): void;
};

// https://bost.ocks.org/mike/chart/
export default function <D = any>(): D3Container<D> {
  let _width = 700;
  let _height = 700;
  let _underlays: Underlay<D>[] = [];
  let _content: Content<D>[] = [];
  let _overlays: Underlay<D>[] = [];

  function render(selection: Selection<SVGSVGElement, D, null, undefined>) {
    selection.each((data) => {
      selection.attr("viewBox", [0,0, _width, _height])
      // const everything = selection.selectAll("*");
      // everything.remove();

      const underlays = selection.selectAll('#underlays').data([1]).join('g').attr("id", "underlays");
      const content = selection.selectAll('#content').data([1]).join('g').attr("id", "content")
      const overlays = selection.selectAll('#overlays').data([1]).join("g").attr("id", "overlays");
      
      // @ts-ignore TODO: fix typing
      _underlays.forEach((layer) => layer(selection, underlays, data)); // TODO: fix typing
      // @ts-ignore TODO: fix typing
      _content.forEach((layer) => layer(selection, content, data)); // TODO: fix typing
      // @ts-ignore TODO: fix typing
      _overlays.forEach((layer) => layer(selection, overlays, data)); // TODO: fix typing
    });
  }

  function container(datum: D, svgRef: SVGSVGElement) {
    select(svgRef).datum(datum).call(render);
  }

  container.width = (value?: number) =>
    value ? ((_width = value), container) : _width;
  container.height = (value?: number) =>
    value ? ((_height = value), container) : _height;

  container.underlays = (value?: Underlay<D>[]) =>
    value ? ((_underlays = value), container) : _underlays;
  container.content = (value?: Content<D>[]) =>
    value ? ((_content = value), container) : _content;
  container.overlays = (value?: Underlay<D>[]) =>
    value ? ((_overlays = value), container) : _overlays;

  container.render = container;

  return container as D3Container<D>;
}
