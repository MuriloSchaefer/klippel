interface SVGManager {
  loadSVG: (svgPath: string) => Promise<string>;
}
const useSVG = (): SVGManager => {
  return {
    loadSVG: async (svgPath: string) => {
      const response = await fetch(svgPath);
      const blob = await response.blob();
      return blob.text();
    },
  };
};

export default useSVG;
