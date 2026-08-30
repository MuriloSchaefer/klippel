-- Name an organization the first time an edge points at it. Existing rows are
-- left alone: the edit that created this reference is not a statement about
-- the organization's own fields.
INSERT INTO organizations (id, org_key, type, name, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO NOTHING;
