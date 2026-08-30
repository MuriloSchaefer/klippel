-- Just enough of a row to write against it: its storage id and current type.
SELECT id, type, schema_version FROM materials WHERE material_key = ?;
