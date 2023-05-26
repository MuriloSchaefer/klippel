import { SimulationLinkDatum, SimulationNodeDatum } from "d3";

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
  
export interface D3Graph {
    nodes: D3Node[];
    links: D3Link[];
  }