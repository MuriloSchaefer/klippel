import React, { ReactElement, useEffect, useState } from "react";
import { SvgLoader } from "react-svgmt";
import useSVG from "../../hooks/loadSVG";

interface UseModelProps {
  mannequinSize: string;
  product: string;
  model: string;
  children: ReactElement;
}

/** Hook that loads an SVG model */
const SVGManager = ({
  mannequinSize,
  product,
  model,
  children,
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
    <SvgLoader svgXML={svgXML}>{children}</SvgLoader>
  ) : (
    <div>Loading...</div>
  );
};

export default SVGManager;
