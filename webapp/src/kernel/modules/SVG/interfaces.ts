import { Selection, SimulationLinkDatum, SimulationNodeDatum } from "d3";

export type D3Component<D = any> = (
  root: Selection<SVGSVGElement, D, any, any>,
  selection: Selection<SVGElement, D, SVGSVGElement, D>,
  datum: D
) => void;

export type D3Node = SimulationNodeDatum & {
    id: string;
    nodeLabel: string;
    group: {id?: string, name: string};
    radius: number;
    strength: number;
    x: number;
    y: number;
  }
export interface D3Link extends SimulationLinkDatum<D3Node> {
    id: string;
    type: string;
    source: string;
    target: string;
  }
  
export interface D3Graph<N =D3Node, L=D3Link> {
    nodes: N[];
    links: L[];
  }


  export type EditorToolkit = {
    tools: {
      hightlightedElements: string[]
      pickElement: {
        type: 'SVGElement';
        enabled: boolean;
        getSelectables: (svgRoot: SVGSVGElement) => SVGElement[]
        callback: (element: SVGElement) => void;
      };
    };
  };