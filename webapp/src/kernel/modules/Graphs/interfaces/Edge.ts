export type EdgeId = string;
export interface Edge {
  id: EdgeId;
  type: string;

  sourceId: string;
  targetId: string;
}

export default Edge;
