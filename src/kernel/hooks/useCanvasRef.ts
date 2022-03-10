import { MutableRefObject, useRef } from "react";

const useCanvasRef = (
  initialValue?: any
): MutableRefObject<HTMLCanvasElement> => {
  const canvasRef = useRef<HTMLCanvasElement>(initialValue);

  return canvasRef;
};

export default useCanvasRef;
