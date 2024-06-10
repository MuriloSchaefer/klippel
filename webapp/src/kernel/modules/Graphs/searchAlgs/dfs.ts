import Node from "../interfaces/Node";
import { GraphSearch, GraphState, SearchResult } from "../store/state";

const dfs = (
  graph: Omit<GraphState, "searchResults">,
  nodeStart: string,
  validate: (
    node: Node,
    graph: GraphSearch,
    currFindings: Node[],
    visitedNodes: Node[]
  ) => boolean,
  stopCriteria: (
    node: Node,
    graph: GraphSearch,
    currFindings: Node[],
    visitedNodes: Node[]
  ) => boolean,
  getNeighbours: (node: Node, graph: GraphSearch) => string[] = (node, graph) => [...graph.adjacencyList[node.id].inputs, ...graph.adjacencyList[node.id].outputs], 
  depth?: number
): Omit<SearchResult, "outdated"> => {
  const visited: Node[] = [];
  const findings = [];
  let currDepth = 0;
  const stack = [nodeStart];
  let parentMap: {[child: string]: string} = {} // https://stackoverflow.com/questions/12864004/tracing-and-returning-a-path-in-depth-first-search
  let lastNode: string = nodeStart

  while (stack.length) {
    const visiting = stack.pop();
    if (!visiting) {
      break;
    }
    lastNode = visiting
    const node = graph.nodes[visiting];
    visited.push(node);
    const match = validate(node, graph, findings, visited);
    if (match) {
      findings.push(node);

      if (stopCriteria(node, graph, findings, visited)) {
        break; 
      }

      if (depth && currDepth >= depth) {
        currDepth -= 1;
        continue;
      }
      const neighbours = getNeighbours(node, graph)
      const notVisitedNeighbours = neighbours.filter(
        (e) =>
          !visited.map((v) => v.id).includes(graph.edges[e].targetId)
      ).map((e) => graph.edges[e].targetId);

      stack.push(...notVisitedNeighbours);
      parentMap = notVisitedNeighbours.reduce((acc, curr) =>({...acc, [curr]: visiting}), parentMap)

      currDepth += 1;
    }
  }

  // reconstruct path
  const path = []
  let currNode = lastNode
  while (currNode){
    path.push(currNode)
    currNode = parentMap[currNode]
  }
  path.reverse()

  return {
    findings: findings,
    visited: visited,
    path: path
  };
};

export default dfs;
