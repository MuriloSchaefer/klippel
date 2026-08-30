-- Rows deleted since a client's watermark.
--
-- A delta has to report removals and a row that is gone cannot report itself,
-- which is the whole reason `catalog_tombstones` exists.
SELECT material_key FROM catalog_tombstones WHERE deleted_at > ?;
