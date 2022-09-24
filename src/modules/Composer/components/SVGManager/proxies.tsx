import React from "react";
import { SvgProxy } from "react-svgmt";
import { CompositionGraphState } from "modules/Composer/store/state";
import { Material } from "modules/Composer/interfaces/Material";

import { Composition } from "modules/Composer/interfaces/Composition";
import { NodesHashMap } from "@kernel/modules/GraphsModule/store/state";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";

export interface ProxiesProps {
  graphId: string;
  onPartsLoaded?: (svgRoot: SVGElement) => void;
  onClick?: (props: {
    selectedMaterial: Material | Composition;
    event: MouseEvent;
  }) => void;
  onDblClick?: (props: {
    selectedMaterial: Material | Composition;
    event: MouseEvent;
  }) => void;
  onMouseDown?: (props: {
    selectedMaterial: Material | Composition;
    event: MouseEvent;
  }) => void;
}

const Proxies = ({
  graphId,
  onPartsLoaded,
  onClick,
  onDblClick,
  onMouseDown,
}: ProxiesProps) => {
  // const [parts, setParts] = React.useState<Material[]>([]);
  const graphModule = useModule<IGraphModule>("GraphModule");

  const { state: nodes } = graphModule.hooks.useGraph<
    CompositionGraphState,
    NodesHashMap<Composition | Material>
  >(graphId, (g) => g.nodes);

  if (!nodes) return null;

  /**
   * Attach on click event to garment parts
   * @param svgRoot SVG element
   */
  const attachMouseListeners = (svgRoot: SVGElement) => {
    const listener = (
      e: MouseEvent,
      callback: CallableFunction | undefined
    ) => {
      if (e.target instanceof SVGElement && callback) {
        callback({ selectedMaterial: nodes[svgRoot.id], event: e });
        e.stopPropagation();
      }
    };

    if (nodes[svgRoot.id].properties.Tipo !== undefined) {
      svgRoot.addEventListener("dblclick", (e: MouseEvent) =>
        listener(e, onDblClick)
      );
      svgRoot.addEventListener("click", (e: MouseEvent) =>
        listener(e, onClick)
      );
      svgRoot.addEventListener("mousedown", (e: MouseEvent) =>
        listener(e, onMouseDown)
      );
    }

    if (onPartsLoaded) onPartsLoaded(svgRoot);
  };

  return (
    <>
      {nodes &&
        Object.entries(nodes)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_id, node]) => node.properties.Nome !== undefined) // only attach listener in nodes that have a name property (has metadata)
          .map(([id, node]) => (
            <SvgProxy
              key={id}
              selector={`#${id}`}
              fill={node.properties.Cor?.value}
              onElementSelected={attachMouseListeners}
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
  onClick: () => null,
  onDblClick: () => null,
  onMouseDown: () => null,
};

export default Proxies;
