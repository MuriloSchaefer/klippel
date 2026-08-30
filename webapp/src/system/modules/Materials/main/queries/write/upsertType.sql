INSERT INTO material_types (id, type_key, schema_json) VALUES (?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  type_key = excluded.type_key,
  schema_json = excluded.schema_json;
