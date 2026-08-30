-- Every edge of the given materials.
--
-- Whole sets, not only the edges that changed: a material's industry and its
-- suppliers are derived from its entire edge set, so a partial answer silently
-- drops relations.
SELECT edge_key, source_key, type, target_id FROM material_edges
WHERE source_key IN (SELECT value FROM json_each(?));
