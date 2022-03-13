import Viewport, { ViewportProps } from "@kernel/viewport";
import React from "react";
import useModel from "../hooks/useModel";

type ComposerViewportProps = ViewportProps;

const ComposerViewport = ({ ref }: ComposerViewportProps) => {
  const svgViewport = useModel({
    mannequinSize: "p",
    product: "camiseta-fem",
    model: "modelo",
  });
  return <Viewport ref={ref}>{svgViewport}</Viewport>;
};

export default ComposerViewport;
