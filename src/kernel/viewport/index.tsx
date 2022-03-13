import React, { Ref } from "react";
import StyledViewport from "./styles";

export interface ViewportProps {
  ref: Ref<HTMLDivElement>;
  children?: React.ReactElement;
}

/**
 * Renders a new Viewport
 * @param {ViewportProps} props viewport properties
 * @returns a React element for the viewport
 */
const Viewport = ({ ref, children }: ViewportProps): React.ReactElement => (
  <StyledViewport ref={ref}>{children}</StyledViewport>
);

Viewport.defaultProps = {
  children: null,
};

export default Viewport;
