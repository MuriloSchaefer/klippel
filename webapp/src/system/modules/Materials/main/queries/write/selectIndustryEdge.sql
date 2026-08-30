-- The industry a material is denormalised from: its first `manufacturedBy`.
SELECT target_id FROM material_edges
WHERE source_key = ? AND type = 'manufacturedBy' LIMIT 1;
