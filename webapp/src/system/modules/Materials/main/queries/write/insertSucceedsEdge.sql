-- Link a type version to the one it replaces.
INSERT INTO material_edges (id, edge_key, source_id, source_key, type, target_id)
VALUES (?, ?, '', ?, 'succeedsVersion', ?)
ON CONFLICT(id) DO UPDATE SET target_id = excluded.target_id;
