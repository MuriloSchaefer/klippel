import React, { ReactElement, useEffect, useState } from "react";
import { useAppDispatch } from "@kernel/store/hooks";
import { startSVGLoad, SVGLoaded } from "modules/Composer/store/actions";
import { SvgLoader } from "react-svgmt";
import useSVG from "../../hooks/loadSVG";

interface UseModelProps {
  mannequinSize: string;
  product: string;
  model: string;
  graphId: string;
  children: ReactElement;
}

/** Hook that loads an SVG model */
const SVGManager = ({
  graphId,
  mannequinSize,
  product,
  model,
  children,
}: UseModelProps): ReactElement => {
  const dispatch = useAppDispatch();
  const [svgXML, setSvgXML] = useState<string>("");

  useEffect(() => {
    const loadSVG = async () => {
      dispatch(startSVGLoad({ product, model }));
      const svgText = await useSVG(mannequinSize, product, model);
      setSvgXML(svgText);
    };
    loadSVG();
  }, [mannequinSize, product, model]);

  return svgXML ? (
    <SvgLoader
      svgXML={svgXML}
      onSVGReady={(svgRoot: SVGElement) =>
        dispatch(SVGLoaded({ graphId, svgRoot }))
      }
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </SvgLoader>
  ) : (
    <div>Loading...</div>
  );
};

export default SVGManager;
