export type EdgeId = string;
export interface Edge {
  id: EdgeId;

  sourceId: string;

  targetId: string;
}

export default Edge;
