import { Properties } from "./interfaces";

export const xdom2properties = (node: Element): Properties => {
    const children = Array.from(node.children);
    const metadata = children.find((c) => c.tagName === "metadata");
    if (!metadata) return {} as Properties;
  
    const odmProperties = Array.from(metadata.children);
    const properties = odmProperties.reduce((acc, property) => {
      const name = property.getAttribute("xodm:name");
      const value = property.getAttribute("xodm:value");
      const type = property.getAttribute("xodm:type");
  
      if (!name || !value || !type) return acc;
  
      return { ...acc, [name]: { value, type } };
    }, {} as Properties);
  
    return properties;
  };