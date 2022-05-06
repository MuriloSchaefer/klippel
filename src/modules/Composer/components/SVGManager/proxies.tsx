import React, { useEffect } from "react";
import { useAppSelector } from "@kernel/store/hooks";
import { SvgProxy } from "react-svgmt";
import {
  MannequinProperties,
  MannequinLayer,
} from "modules/Composer/interfaces/Mannequin";
import {
  DEFAULT_MANNEQUIN_COLOR,
  DEFAULT_PART_COLOR,
} from "modules/Composer/constants";
import { CompositionGraphState } from "modules/Composer/store/state";
import { Part, PartsLayer } from "modules/Composer/interfaces/Part";

export interface ProxiesProps {
  graphId: string;
  onPartsLoaded?: (svgRoot: SVGElement) => void;
  onPartSelected?: (part: Part) => void;
  onMannequinLoaded?: (svgRoot: SVGElement) => void;
}

const Proxies = ({
  graphId,
  onPartsLoaded,
  onPartSelected,
  onMannequinLoaded,
}: ProxiesProps) => {
  const [parts, setParts] = React.useState<Part[]>([]);

  const graph = useAppSelector<CompositionGraphState>(
    (state) => state.graphsManager.graphs[graphId]
  );

  if (!graph) {
    return null;
  }

  /**
   * Finds all parts and attaches onClick listener to each one.
   */
  useEffect(() => {
    const filteredNodes = Object.values(graph.nodes).filter(
      (node): node is Part => node.type === "Part"
    );
    setParts(filteredNodes);
  }, [graph]);

  const {
    mannequinProperties,
    partsLayer,
  }: {
    mannequinLayer: MannequinLayer;
    partsLayer: PartsLayer;
    mannequinProperties?: MannequinProperties;
  } = graph.nodes;

  /**
   * Attach on click event to garment parts
   * @param svgRoot SVG element
   */
  const attachListeners = (svgRoot: SVGElement) => {
    svgRoot.addEventListener("click", (e: MouseEvent) => {
      if (e.target instanceof SVGElement && onPartSelected) {
        onPartSelected(graph.nodes[e.target.id] as Part);
      }
    });
    if (onPartsLoaded) onPartsLoaded(svgRoot);
  };

  return (
    <>
      {partsLayer &&
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parts.map((part) => {
          switch (part.type) {
            case "Part":
              return (
                <SvgProxy
                  key={part.id}
                  selector={`#${part.id}`} // add selector to part node
                  fill={part.properties.color || DEFAULT_PART_COLOR}
                  onElementSelected={attachListeners}
                />
              );
            default:
              // do not add a proxy if node is not a part
              return null;
          }
        })}

      <SvgProxy
        selector="#maneco"
        fill={mannequinProperties?.skinColor || DEFAULT_MANNEQUIN_COLOR}
        onElementSelected={onMannequinLoaded}
      />
    </>
  );
};

Proxies.defaultProps = {
  onPartsLoaded: () => null,
  onPartSelected: () => null,
  onMannequinLoaded: () => null,
};

export default Proxies;
