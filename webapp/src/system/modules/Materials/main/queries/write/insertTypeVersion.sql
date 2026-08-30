-- A new type version. Not an upsert: registering a version that already
-- exists is a caller bug, so it is allowed to fail on the primary key.
INSERT INTO material_types (id, type_key, schema_json) VALUES (?, ?, ?);
