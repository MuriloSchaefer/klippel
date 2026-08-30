-- Many materials, by domain id.
--
-- The keys arrive as one JSON array rather than as N bound parameters: SQLite
-- caps host parameters (999 by default), and a page plus its pinned rows can
-- exceed that. `json_each` also keeps the statement static, so it prepares
-- once and lives in the cache instead of being rebuilt per call.
SELECT * FROM materials
WHERE material_key IN (SELECT value FROM json_each(?));
