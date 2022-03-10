import useCanvasRef from "@kernel/hooks/useCanvasRef";
import React, { useEffect } from "react";
import StyledCanvas from "./styles";

interface CanvasProps {
  width?: number;
  height?: number;
}

const Canvas = ({ width, height }: CanvasProps) => {
  const canvasRef = useCanvasRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        context.beginPath();
        context.arc(50, 50, 50, 0, 2 * Math.PI);
        context.fill();
      }
    }
  }, []);

  return <StyledCanvas height={height} width={width} ref={canvasRef} />;
};

Canvas.defaultProps = {
  width: window.innerWidth,
  height: window.innerHeight,
};

export default Canvas;
