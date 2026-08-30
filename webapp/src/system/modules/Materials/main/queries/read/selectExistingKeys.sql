-- Which of these domain ids the catalog actually holds.
SELECT material_key FROM materials
WHERE material_key IN (SELECT value FROM json_each(?));
