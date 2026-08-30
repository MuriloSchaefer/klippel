-- Every edge that touches this material, in either direction.
DELETE FROM material_edges WHERE source_key = ? OR target_id = ?;
