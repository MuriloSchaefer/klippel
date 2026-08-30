-- Full-text search over the whole catalog.
--
-- Ranked by relevance first (`bm25`), then by the same usage/key order the
-- browse view uses, so a search page is stable under paging. Search runs here,
-- never in the renderer: the renderer holds a page, and filtering that would
-- only ever search rows the user can already see.
SELECT m.material_key AS key
FROM materials_fts f
JOIN materials m ON m.material_key = f.id
LEFT JOIN material_usage u ON u.material_id = m.id
WHERE materials_fts MATCH ?
ORDER BY bm25(materials_fts), COALESCE(u.uses, 0) DESC, m.material_key ASC;
