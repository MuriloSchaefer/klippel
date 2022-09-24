import React, { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import styled from "styled-components";
import { floatingDocumentationCollapsed } from "../store/actions";

const StyledFloatingDocumentation = styled.div<{
  visible: boolean;
  x: number;
  y: number;
}>`
  width: ${(p) => (p.visible ? "500px" : "0px")};
  height: ${(p) => (p.visible ? "500px" : "0px")};
  margin: 0.5em;
  border-radius: 2%;
  position: absolute;
  z-index: 9999;
  left: ${(p) => `${p.x}px`};
  top: ${(p) => `${p.y}px`};
  background-color: red;
  transition: width 0.1s ease, height 0.1s ease;
`;

const FloatingDocumentationContainer = () => {
  const dispatch = useAppDispatch();
  const mousePosition = useAppSelector(
    (state) => state.MouseManager.mousePosition
  );
  const documentation = useAppSelector(
    (state) => state.MouseManager.documentation
  );
  const elemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (documentation.visible && elemRef.current) {
      elemRef.current.addEventListener("pointerout", () => {
        dispatch(floatingDocumentationCollapsed());
      });
    }
  }, [documentation.visible]);

  return (
    <StyledFloatingDocumentation
      id="floating-documentation"
      ref={elemRef}
      visible={documentation.visible}
      x={mousePosition.x}
      y={mousePosition.y}
    >
      {documentation.content}
    </StyledFloatingDocumentation>
  );
};

export default FloatingDocumentationContainer;
