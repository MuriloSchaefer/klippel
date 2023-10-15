import { Selection, select } from "d3";

type Underlay<D = any> = (selection: Selection<SVGElement, D, any, any>, datum: D) => void;

type D3Container<D = any> = {
  width(value: number): D3Container<D>;
  width(): number;

  height(): number;
  height(value: number): D3Container<D>;

  underlays(): any[];
  underlays(value: Underlay<D>[]): D3Container<D>;

  render(datum: D, svgRef: SVGSVGElement): void;
};

// https://bost.ocks.org/mike/chart/
export default function <D = any>(): D3Container<D> {
  let _width = 700;
  let _height = 700;
  let _underlays: Underlay<D>[] = []

  function render(selection: Selection<SVGSVGElement, D, null, undefined>) {
    selection.each((data) => {
      const underlays = selection.append('g').attr('id', 'underlays')
      // @ts-ignore TODO: fix typing
      _underlays.forEach(layer => layer(underlays, data)) // TODO: fix typing
      const content = selection.append('g').attr('id', 'content')
      const overlays = selection.append('g').attr('id', 'overlays')
    });
  }

  function container(datum: D, svgRef: SVGSVGElement) {
    select(svgRef).datum(datum).call(render);
  }

  container.width = function (value?: number) {
    return value ? ((_width = value), container) : _width;
  };
  container.height = function (value?: number) {
    return value ? ((_height = value), container) : _height;
  };

  container.underlays = function (value?: Underlay<D>[]) {
    return value ? ((_underlays = value), container) : _underlays;
  }

  container.render = container;

  return container as D3Container<D>;
}
