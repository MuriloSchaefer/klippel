import { useState } from "react";

const useSVG = () => {
  const [loadedSVG, setLoadedSVG] = useState(null);

  return [loadedSVG, setLoadedSVG];
};

export default useSVG;
