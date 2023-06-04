import { PointerEvent, useCallback, useState } from "react";

const useDraggable = ({
  initialPosition,
}: {
  initialPosition: { x: number; y: number };
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startDragPosition, setStartDragPosision] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(initialPosition);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    setIsDragging(true);
    setStartDragPosision({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = {
        x: e.clientX - startDragPosition.x,
        y: e.clientY - startDragPosition.y,
      };
      const newPosition = {
        x: position.x + delta.x,
        y: position.y + delta.y,
      };
      setPosition(newPosition);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback((e: PointerEvent) => {
    setIsDragging(false);
    e.stopPropagation();
  }, []);

  return {
    position,
    setPosition,
    listeners: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
};

export default useDraggable;
