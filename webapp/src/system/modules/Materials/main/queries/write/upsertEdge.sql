-- Insert or replace one edge.
INSERT INTO material_edges (id, edge_key, source_id, source_key, type, target_id)
VALUES (@id, @edge_key, @source_id, @source_key, @type, @target_id)
ON CONFLICT(id) DO UPDATE SET
  edge_key = excluded.edge_key,
  source_id = excluded.source_id,
  source_key = excluded.source_key,
  type = excluded.type,
  target_id = excluded.target_id;
