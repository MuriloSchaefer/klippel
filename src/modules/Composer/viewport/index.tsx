import Viewport, { ViewportProps } from "@kernel/viewport";
import React from "react";
import useSVG from "../hooks/useSVG";

interface ComposerViewportProps extends ViewportProps {
  modelPath: string;
}

const ComposerViewport = ({ ref, modelPath }: ComposerViewportProps) => {
  const svgViewport = useSVG({
    path: modelPath,
  });
  return <Viewport ref={ref}>{svgViewport}</Viewport>;
};

export default ComposerViewport;
