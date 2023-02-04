import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { useEffect, useMemo } from "react";
import { ReactSVG } from "react-svg";
import { selectSVGState } from "../store/selectors";

interface SVGViewerProps {
  path: string;
}

const SVGViewer = ({ path }: SVGViewerProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const svgState = useAppSelector(selectSVGState(path));

  const objURL = useMemo(
    () =>
      svgState?.content &&
      window.URL.createObjectURL(
        new Blob([svgState.content], { type: "image/svg+xml" })
      ),
    [svgState?.content]
  );
  if (!svgState || !objURL) return null;

  return (
    <>
      <ReactSVG
        src={objURL}
        id={path}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      />
    </>
  );
};

export default SVGViewer;
