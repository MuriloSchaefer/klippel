import React from "react";
import { SvgProxy } from "react-svgmt";
import { CompositionGraphState } from "modules/Composer/store/state";
import { Part } from "modules/Composer/interfaces/Part";
import useGraph from "@kernel/hooks/useGraph";
import Composition from "modules/Composer/interfaces/Composition";
import { NodesHashMap } from "@kernel/modules/GraphsManager/store/state";

export interface ProxiesProps {
  graphId: string;
  onPartsLoaded?: (svgRoot: SVGElement) => void;
  onMaterialSelected?: (part: Part) => void;
}

const Proxies = ({
  graphId,
  onPartsLoaded,
  onMaterialSelected,
}: ProxiesProps) => {
  // const [parts, setParts] = React.useState<Part[]>([]);

  const { state: nodes } = useGraph<
    CompositionGraphState,
    NodesHashMap<Composition | Part>
  >(graphId, (g) => g.nodes);

  if (!nodes) return null;

  /**
   * Attach on click event to garment parts
   * @param svgRoot SVG element
   */
  const attachListeners = (svgRoot: SVGElement) => {
    svgRoot.addEventListener("click", (e: MouseEvent) => {
      if (e.target instanceof SVGElement && onMaterialSelected) {
        onMaterialSelected(nodes[e.target.id] as Part);
      }
    });
    if (onPartsLoaded) onPartsLoaded(svgRoot);
  };

  return (
    <>
      {nodes &&
        Object.entries(nodes).map(([id, node]) => (
          <SvgProxy
            key={id}
            selector={`#${id}`}
            fill={"color" in node.properties ? node.properties.color : "blue"}
            onElementSelected={attachListeners}
          />
        ))}

      {/* <SvgProxy
        selector="#maneco"
        fill={mannequinProperties?.skinColor || DEFAULT_MANNEQUIN_COLOR}
        onElementSelected={onMannequinLoaded}
      /> */}
    </>
  );
};

Proxies.defaultProps = {
  onPartsLoaded: () => null,
  onMaterialSelected: () => null,
};

export default Proxies;
