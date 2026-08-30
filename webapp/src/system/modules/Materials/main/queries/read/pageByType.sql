-- One page of a single type — the material pickers' view.
SELECT m.material_key AS key
FROM materials m
LEFT JOIN material_usage u ON u.material_id = m.id
WHERE m.type = ?
ORDER BY COALESCE(u.uses, 0) DESC, m.material_key ASC
LIMIT ? OFFSET ?;
