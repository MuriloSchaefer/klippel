import { Properties } from "./interfaces";
import { fromRDF } from "jsonld";
import { graph, IndexedFormula, literal, parse, serialize, sym } from "rdflib";
import { expand } from "jsonld";
import { RDF, SELF } from "./constants";

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

export const rdfxml2interpreter = (node: Element): IndexedFormula => {
  const uri = "_:";
  const interpreter = graph();

  parse(node.innerHTML, interpreter, uri, "application/rdf+xml");

  return interpreter
};

export const interpreter2jsonld = async (interpreter: IndexedFormula) => {
  return new Promise((resolve, reject) => {
    serialize(null, interpreter, '_:', "application/ld+json", (err, jsonldData) => {
      if (err || !jsonldData) {
        console.error(err);
        reject(err);
        return;
      }
      //resolve(JSON.parse(jsonldData))
      expand(JSON.parse(jsonldData)).then((expanded) => resolve(expanded));
    });
  });
}

export const jsonld2interpreter = (nodes: any[]) => {
  /**
   * Recursive function to connect all edges of a certain node
   */
  const linkNode = (interpreter: IndexedFormula, nodeId: string, predicate: any, values: any[]) => {
    values.forEach((entry: any) => {

      // any entry key that is not id or value
      Object.entries(entry).forEach(([k, v]: [string, any]) => {
        if (k === '@id' || k === '@value') {
          const obj = '@id' in entry ? sym(entry['@id']) : literal(entry['@value'])
          interpreter.add(sym(nodeId), predicate, obj)
          return
        }
        linkNode(interpreter, nodeId, predicate, v)
      })
    })
  }

  var interpreter = graph()

  nodes.filter(n => ('@id' in n) && ('@type' in n))

  // add all nodes
  nodes.forEach(node => {
      const nodeId = node['@id']
      node['@type'].forEach((type: string) => {
          const predicate = type.startsWith('_:') ? SELF('type') : RDF('type')
          interpreter.add(nodeId, predicate, type.split('#')[1])
      })

  })

  // link nodes
  nodes.forEach(node => {
      const nodeId = node['@id']
      Object.entries(node).forEach(([key, values]: [string, any]) => {
          if (['@id', '@type'].includes(key)) return
          const suffix = key.split('#')[1]
          const predicate = key.startsWith('_:') ? SELF(suffix) : RDF(suffix)
          linkNode(interpreter, nodeId, predicate, values)

      })
  })

  return interpreter

}
