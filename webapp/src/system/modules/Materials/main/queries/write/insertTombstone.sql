INSERT INTO catalog_tombstones (material_key, deleted_at) VALUES (?, ?)
ON CONFLICT(material_key) DO UPDATE SET deleted_at = excluded.deleted_at;
