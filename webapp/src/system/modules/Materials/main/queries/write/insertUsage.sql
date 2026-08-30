-- Usage is keyed by storage id, and the counts arrive keyed by domain id, so
-- the insert resolves one to the other. A count for a material this workspace
-- does not hold selects no rows and is dropped, rather than violating the
-- foreign key — a model can reference a material that was never imported here.
INSERT INTO material_usage (material_id, uses)
SELECT id, ? FROM materials WHERE material_key = ?
ON CONFLICT(material_id) DO UPDATE SET uses = excluded.uses;
