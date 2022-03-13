import React, { useEffect, useState } from "react";
import { SvgLoader, SvgProxy } from "react-svgmt";

interface useModelProps {
  mannequinSize: string;
  product: string;
  model: string;
}

/** Hook that loads an SVG model */
const useModel = ({ mannequinSize, product, model }: useModelProps) => {
  // We want to update only elements that match this selectors
  const selectors = ["rect:nth-child(1)", "rect:nth-child(4)"];
  const svgPath = `/catalog/${product}/croqui-${mannequinSize}/${model}.svg`;

  const [svgFile, setSVGFile] = useState<Blob | null>(null);

  useEffect(() => {
    fetch(svgPath)
      .then((response) => response.blob())
      .then((blob) => {
        console.log(blob);
        setSVGFile(blob);
      });
  }, [mannequinSize, product, model]);

  console.log(svgFile);

  return (
    <SvgLoader path={svgPath}>
      <SvgProxy selector="test" fill="red" />
      {selectors.map((selector, ix) => (
        // eslint-disable-next-line react/no-array-index-key
        <SvgProxy key={ix} selector={selector} fill="blue" />
      ))}
    </SvgLoader>
  );
};

export default useModel;
