import { Properties } from "./interfaces";
import { fromRDF } from "jsonld";
import { graph, parse, serialize } from "rdflib";
import { expand } from "jsonld";

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

export const rdf2jsonld = async (node: Element): Promise<any> => {
  console.group("rdf2json");
  console.log("node", node);
  const uri = "_:";
  const store = graph();

  parse(node.innerHTML, store, uri, "application/rdf+xml");

  //   const ld = $rdf.serialize(null, store, uri, 'application/ld+json', (err, jsonldData) => {
  //     if (err || !jsonldData) {
  //       console.error(err)
  //       return;
  //     }
  //     return JSON.parse(jsonldData)
  // })

  //console.log('output', ld)
  console.groupEnd();
  return new Promise((resolve, reject) => {
    serialize(null, store, uri, "application/ld+json", (err, jsonldData) => {
      if (err || !jsonldData) {
        console.error(err);
        reject(err);
        return;
      }
      resolve(JSON.parse(jsonldData))
      //expand(JSON.parse(jsonldData)).then((expanded) => resolve(expanded));
    });
  });
};
