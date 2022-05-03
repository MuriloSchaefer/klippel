import React from "react";
import { useAppSelector } from "@kernel/store/hooks";
import { SvgProxy } from "react-svgmt";
import {
  MannequinAttributes,
  MannequinLayer,
} from "modules/Composer/interfaces/Mannequin";
import { DEFAULT_MANNEQUIN_COLOR } from "modules/Composer/constants";
import { CompositionGraphState } from "modules/Composer/store/state";

export interface ProxiesProps {
  graphId: string;
  onPartsLoaded?: (svgRoot: SVGElement) => void;
  onMannequinLoaded?: (svgRoot: SVGElement) => void;
}

const Proxies = ({
  graphId,
  onPartsLoaded,
  onMannequinLoaded,
}: ProxiesProps) => {
  const graph = useAppSelector<CompositionGraphState>(
    (state) => state.graphsManager.graphs[graphId]
  );

  if (!graph) {
    return null;
  }

  const {
    mannequinAttributes,
  }: {
    mannequinLayer: MannequinLayer;
    mannequinAttributes?: MannequinAttributes;
  } = graph.nodes;

  return (
    <>
      <SvgProxy
        selector="#partes"
        fill="red"
        onElementSelected={onPartsLoaded}
      />
      <SvgProxy
        selector="#maneco"
        fill={mannequinAttributes?.skinColor || DEFAULT_MANNEQUIN_COLOR}
        onElementSelected={onMannequinLoaded}
      />
    </>
  );
};

Proxies.defaultProps = {
  onPartsLoaded: () => null,
  onMannequinLoaded: () => null,
};

export default Proxies;
