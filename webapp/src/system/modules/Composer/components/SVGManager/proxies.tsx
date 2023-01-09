import React, { useEffect, useRef } from "react";
import { CompositionGraphState } from "modules/Composer/store/state";
import { Material } from "modules/Composer/interfaces/Material";

import { Composition } from "modules/Composer/interfaces/Composition";
import { NodesHashMap } from "@kernel/modules/Graphs/store/state";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

export interface ProxiesProps {
  graphId: string;
  svgRoot?: SVGSVGElement;
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

interface SVGProxyProps {
  selector: string;
  svgRoot?: SVGSVGElement;
  attributes: {
    [name: string]: any;
  };
  callbacks: {
    [evtName: string]: (event: Event) => void;
  };
}
const SVGProxy = ({
  selector,
  svgRoot,
  attributes,
  callbacks,
}: SVGProxyProps) => {
  const elem = useRef<SVGElement | null>(null);

  useEffect(() => {
    if (svgRoot) {
      const ref = svgRoot.getElementById(selector) as SVGElement;

      if (ref) {
        elem.current = ref;

        Object.entries(attributes).forEach(([attr, value]) => {
          ref.setAttribute(attr, value);
        });

        Object.entries(callbacks).forEach(([event, cb]) => {
          ref.addEventListener("click", (e) => console.log(e));
          ref.onclick = cb;
        });
      }
    }
  }, [svgRoot]);

  return <div role={`${selector}-proxy`}></div>;
};

const Proxies = ({
  graphId,
  svgRoot,
  onPartsLoaded,
  onClick,
  onDblClick,
  onMouseDown,
}: ProxiesProps) => {
  // const [parts, setParts] = React.useState<Material[]>([]);
  const graphModule = useModule<IGraphModule>("GraphModule");

  const { state: nodes } = graphModule.hooks.module.useGraph<
    CompositionGraphState,
    NodesHashMap<Composition | Material>
  >(graphId, (g) => g.nodes);

  if (!nodes) return null;

  const listener = (
    e: MouseEvent,
    svgRoot: SVGElement,
    callback: CallableFunction | undefined
  ) => {
    if (e.target instanceof SVGElement && callback) {
      callback({ selectedMaterial: nodes[svgRoot.id], event: e });
      e.stopPropagation();
    }
  };

  return (
    <>
      {nodes &&
        Object.entries(nodes)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_id, node]) => node.properties.Nome !== undefined) // only attach listener in nodes that have a name property (has metadata)
          .map(([id, node]) => (
            <SVGProxy
              svgRoot={svgRoot}
              key={id}
              selector={`${id}`}
              attributes={{ style: { fill: node.properties.Cor?.value } }}
              callbacks={{ click: (e) => console.log("clicked", e) }}
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
