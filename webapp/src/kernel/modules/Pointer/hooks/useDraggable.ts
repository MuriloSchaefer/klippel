import { PointerEvent, useCallback, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 3;

const useDraggable = ({
  initialPosition,
}: {
  initialPosition: { x: number; y: number };
}) => {
  const [position, setPosition] = useState(initialPosition);

  const dragStartRef = useRef<{
    pointerId: number;
    origin: { x: number; y: number };
    basePosition: { x: number; y: number };
    captured: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      dragStartRef.current = {
        pointerId: e.pointerId,
        origin: { x: e.clientX, y: e.clientY },
        basePosition: position,
        captured: false,
      };
      e.stopPropagation();
    },
    [position]
  );

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== e.pointerId) return;
    const delta = {
      x: e.clientX - dragStart.origin.x,
      y: e.clientY - dragStart.origin.y,
    };
    // Don't start dragging (or capture the pointer) until the cursor moves
    // past a small threshold — otherwise pointer capture would steal the
    // click event from child controls like the close/action buttons.
    if (
      !dragStart.captured &&
      Math.abs(delta.x) < DRAG_THRESHOLD_PX &&
      Math.abs(delta.y) < DRAG_THRESHOLD_PX
    ) {
      return;
    }
    if (!dragStart.captured) {
      dragStart.captured = true;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // jsdom / unsupported environments: fall back to bubbling events.
      }
    }
    setPosition({
      x: dragStart.basePosition.x + delta.x,
      y: dragStart.basePosition.y + delta.y,
    });
    e.stopPropagation();
  }, []);

  const endDrag = useCallback((e: PointerEvent) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== e.pointerId) return;
    dragStartRef.current = null;
    if (dragStart.captured) {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // Pointer capture may already be released; ignore.
      }
      e.stopPropagation();
    }
  }, []);

  return {
    position,
    setPosition,
    listeners: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
};

export default useDraggable;
