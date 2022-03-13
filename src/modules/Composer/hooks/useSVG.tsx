import React from "react";
import { SvgLoader, SvgProxy } from "react-svgmt";

interface useSVGProps {
  url?: string;
  path?: string;
}

const useSVG = ({ path }: useSVGProps): React.ReactElement => {
  // We want to update only elements that match this selectors
  const selectors = ["rect:nth-child(1)", "rect:nth-child(4)"];

  return (
    <SvgLoader path={path}>
      <SvgProxy selector="test" fill="red" />
      {selectors.map((selector, ix) => (
        // eslint-disable-next-line react/no-array-index-key
        <SvgProxy key={ix} selector={selector} fill="blue" />
      ))}
    </SvgLoader>
  );
};

export default useSVG;
