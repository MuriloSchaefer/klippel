-- Re-adding a deleted id is ordinary; a stale tombstone would tell every
-- client to drop the row they were just given.
DELETE FROM catalog_tombstones WHERE material_key = ?;
