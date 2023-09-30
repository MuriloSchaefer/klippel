import Edge from "../interfaces/Edge";
import Node from "../interfaces/Node";
import { SearchResult, GraphSearch } from "../store/state";



const bfs = (
  graph: GraphSearch,
  nodeStart: string,
  validate: (node: Node, graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean,
  stopCriteria: (
    node: Node,
    graph: GraphSearch,
    currFindings: Node[],
    visitedNodes: Node[]
  ) => boolean,
  depth?: number
): Omit<SearchResult, 'outdated'> => {
  const visited: Node[] = [];
  const findings: Node[] = [];
  let currDepth = 0;
  const queue = [nodeStart];

  while (queue.length) {
    const visiting = queue.shift();
    if (!visiting) {
      break;
    }

    const node = graph.nodes[visiting];
    visited.push(node)
    const match = validate(node, graph, findings, visited);
    if (match) {
      findings.push(node);
    }
    if (stopCriteria(node, graph, findings, visited)) {
      break;
    }

    if (depth && currDepth >= depth) continue
    const neighbours = graph.adjacencyList[visiting];
    queue.push(...neighbours.outputs.map((e) => graph.edges[e].targetId));
    queue.push(...neighbours.inputs.map((e) => graph.edges[e].sourceId));
    currDepth += 1;
  }

  return {
    findings: findings,
    visited: visited,
  };
};

export default bfs;
