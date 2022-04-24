import React, { ReactElement, useEffect, useState } from "react";
import { SvgLoader, SvgProxy } from "react-svgmt";
import useSVG from "../../hooks/loadSVG";

interface UseModelProps {
  mannequinSize: string;
  product: string;
  model: string;
  onPartsLoaded: (svgNode: SVGElement) => void;
}

/** Hook that loads an SVG model */
const SVGManager = ({
  mannequinSize,
  product,
  model,
  onPartsLoaded,
}: UseModelProps): ReactElement => {
  const [svgXML, setSvgXML] = useState<string>("");

  useEffect(() => {
    const loadSVG = async () => {
      const svgText = await useSVG(mannequinSize, product, model);
      setSvgXML(svgText);
    };
    loadSVG();
  }, [mannequinSize, product, model]);

  return svgXML ? (
    <SvgLoader svgXML={svgXML}>
      <SvgProxy
        selector="#partes"
        fill="red"
        onElementSelected={(svgNode: SVGElement) => onPartsLoaded(svgNode)}
      />
    </SvgLoader>
  ) : (
    <div>Loading...</div>
  );
};

export default SVGManager;
