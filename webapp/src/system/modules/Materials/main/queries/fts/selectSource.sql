-- The columns a row's searchable text is built from.
SELECT name, color_label, type, industry, external_id
FROM materials WHERE material_key = ?;
