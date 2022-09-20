import React from "react";
import { SvgProxy } from "react-svgmt";
import { CompositionGraphState } from "modules/Composer/store/state";
import { Material } from "modules/Composer/interfaces/Material";

import { Composition } from "modules/Composer/interfaces/Composition";
import { NodesHashMap } from "@kernel/modules/GraphsManager/store/state";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsManager";

export interface ProxiesProps {
  graphId: string;
  onPartsLoaded?: (svgRoot: SVGElement) => void;
  onMaterialSelected?: (material: Material | Composition) => void;
}

const Proxies = ({
  graphId,
  onPartsLoaded,
  onMaterialSelected,
}: ProxiesProps) => {
  // const [parts, setParts] = React.useState<Material[]>([]);
  const graphManager = useModule<IGraphModule>("GraphManager");

  const { state: nodes } = graphManager.hooks.useGraph<
    CompositionGraphState,
    NodesHashMap<Composition | Material>
  >(graphId, (g) => g.nodes);

  if (!nodes) return null;

  /**
   * Attach on click event to garment parts
   * @param svgRoot SVG element
   */
  const attachListeners = (svgRoot: SVGElement) => {
    if (nodes[svgRoot.id].properties.Tipo !== undefined) {
      svgRoot.addEventListener("dblclick", (e: MouseEvent) => {
        console.log(nodes[svgRoot.id], e);
        if (e.target instanceof SVGElement && onMaterialSelected) {
          onMaterialSelected(nodes[svgRoot.id]);
          e.stopPropagation();
        }
      });
    }

    if (onPartsLoaded) onPartsLoaded(svgRoot);
  };

  return (
    <>
      {nodes &&
        Object.entries(nodes)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_id, node]) => node.properties.Nome !== undefined)
          .map(([id, node]) => (
            <SvgProxy
              key={id}
              selector={`#${id}`}
              fill={node.properties.Cor?.value}
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
