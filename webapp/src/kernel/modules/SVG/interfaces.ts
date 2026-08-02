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


  export type ManipulateMode = "idle" | "drag" | "rotate" | "scale" | "clip";

  // Which selection handles to render. Omitting the prop renders all of them, so
  // existing callers (logo placements) are unaffected; a caller wanting e.g.
  // move + scale only (annotations) passes ["move", "scale"].
  export type ManipulateHandle = "move" | "rotate" | "scale";

  export type ManipulateTransform = {
    x: number;
    y: number;
    rotation: number;
    scale: number;
  };

  export type EditorToolkit = {
    tools: {
      highlightedElements: string[]
      pickElement: {
        type: 'SVGElement';
        enabled: boolean;
        getSelectables: (svgRoot: SVGSVGElement) => SVGElement[]
        callback: (element: SVGElement) => void;
      };
      // The svgtoolbox — spatial editing (move/rotate/scale/clip) of an already
      // injected element. Placement lifecycle (create/rename/delete) is the
      // host's responsibility, so there is no onCopy/onRemove here.
      manipulate: {
        enabled: boolean;
        targetId?: string;                 // the injected element currently selected
        mode: ManipulateMode;
        // Which handles to show; undefined → all (move + rotate + scale).
        handles?: ManipulateHandle[];
        // move + rotate + VISUAL scale (the toolbox attaches no physical/cost meaning)
        onTransform: (id: string, t: ManipulateTransform) => void;
        onClip: (id: string, clipTargetId: string) => void;
      };
    };
  };