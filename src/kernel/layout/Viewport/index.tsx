import React, { Ref } from "react";
import StyledViewport from "./styles";

export interface ViewportProps {
  innerRef: Ref<HTMLDivElement>;
  children?: React.ReactElement;
}

/**
 * Renders a new Viewport
 * @param {ViewportProps} props viewport properties
 * @returns a React element for the viewport
 */
const Viewport = ({
  innerRef,
  children,
}: ViewportProps): React.ReactElement => (
  <StyledViewport ref={innerRef}>{children}</StyledViewport>
);

Viewport.defaultProps = {
  children: null,
};

export default Viewport;
