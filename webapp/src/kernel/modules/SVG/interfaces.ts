import { Selection, SimulationLinkDatum, SimulationNodeDatum } from "d3";

export type D3Component<D = any> = (
  root: Selection<SVGSVGElement, D, any, any>,
  selection: Selection<SVGElement, D, SVGSVGElement, D>,
  datum: D
) => void;

export interface D3Node extends SimulationNodeDatum {
    id: string;
    nodeLabel: string;
    group: string;
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