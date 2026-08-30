INSERT INTO organizations
  (id, org_key, type, label, name, country, contact, pos_x, pos_y, updated_at)
VALUES
  (@id, @org_key, @type, @label, @name, @country, @contact,
   @pos_x, @pos_y, @updated_at)
ON CONFLICT(id) DO UPDATE SET
  org_key = excluded.org_key,
  type = excluded.type,
  label = excluded.label,
  name = excluded.name,
  country = excluded.country,
  contact = excluded.contact,
  pos_x = excluded.pos_x,
  pos_y = excluded.pos_y,
  updated_at = excluded.updated_at;
