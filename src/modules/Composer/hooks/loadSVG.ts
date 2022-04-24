const useSVG = async (
  mannequinSize: string,
  product: string,
  model: string
): Promise<string> => {
  const svgPath = `/catalog/${product}/croqui-${mannequinSize}/${model}.svg`;
  const response = await fetch(svgPath);
  const blob = await response.blob();
  return blob.text();
};

export default useSVG;
