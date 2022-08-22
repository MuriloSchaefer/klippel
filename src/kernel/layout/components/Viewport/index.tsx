import React, { Ref } from "react";
import StyledViewport from "./styles";

export interface ViewportProps {
  id?: string;
  innerRef: Ref<HTMLDivElement>;
  children?: React.ReactElement;
}

/**
 * Renders a new Viewport
 * @param {ViewportProps} props viewport properties
 * @returns a React element for the viewport
 */
export const Viewport = ({
  id,
  innerRef,
  children,
}: ViewportProps): React.ReactElement => (
  <StyledViewport ref={innerRef} id={id}>
    {children}
  </StyledViewport>
);

Viewport.defaultProps = {
  id: "unknown",
  children: null,
};

export default Viewport;
