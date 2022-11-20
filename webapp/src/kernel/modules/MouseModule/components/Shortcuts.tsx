import React, { useEffect, useRef } from "react";
import { useAppSelector } from "@kernel/store/hooks";
import styled from "styled-components";
import { useFloatingShortcuts } from "../hooks/useFloatingShortcuts";

const StyledFloatingShortcuts = styled.div<{ visible: boolean }>`
  position: fixed;
  height: fit-content;
  width: fit-content;
  max-width: ${(p) => (p.visible ? "150px" : "0px")};
  max-height: ${(p) => (p.visible ? "70px" : "0px")};
  margin: 0.5em;
  border-radius: 2%;
  z-index: 9999;
  background-color: red;
  transition: max-width 0.1s ease, max-height 0.1s ease;
`;

const FloatingShortcutsContainer = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const elemRef = useRef<HTMLDivElement | null>(null);
  const mousePosition = useAppSelector(
    (state) => state.MouseModule.mousePosition
  );
  const {
    state,
    hooks: { closeShortcuts },
  } = useFloatingShortcuts(id);

  useEffect(() => {
    if (state?.visible && elemRef.current) {
      elemRef.current.style.setProperty("left", `${mousePosition.x}px`);
      elemRef.current.style.setProperty("top", `${mousePosition.y}px`);

      // For desktop close if mouse moves out of shortcuts container
      elemRef.current.addEventListener("pointerout", () => {
        if (state.visible) closeShortcuts();
      });
      // TODO: For mobiles close when ?
    }
  }, [state?.visible]);

  if (!state) return null;

  return (
    <StyledFloatingShortcuts ref={elemRef} id={id} visible={state.visible}>
      {state.visible && children}
    </StyledFloatingShortcuts>
  );
};

export default FloatingShortcutsContainer;
