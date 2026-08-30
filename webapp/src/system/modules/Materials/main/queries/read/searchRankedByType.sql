-- Full-text search, scoped to one type.
SELECT m.material_key AS key
FROM materials_fts f
JOIN materials m ON m.material_key = f.id
LEFT JOIN material_usage u ON u.material_id = m.id
WHERE materials_fts MATCH ? AND m.type = ?
ORDER BY bm25(materials_fts), COALESCE(u.uses, 0) DESC, m.material_key ASC;
