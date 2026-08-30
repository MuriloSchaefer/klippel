-- Re-point a material's `conformsTo` edge after its type moved.
UPDATE material_edges SET target_id = ? WHERE edge_key = ?;
