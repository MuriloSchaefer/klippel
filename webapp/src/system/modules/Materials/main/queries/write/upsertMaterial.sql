-- Insert or replace one material.
--
-- Keyed on the storage id, which is a hash of `material_key` (db/ids.ts), so
-- the same domain id always lands on the same row — on this peer and on every
-- other one.
INSERT INTO materials (
  id, material_key, type, label, external_id, external_url, image_url,
  description, schema_version, name, color_label, industry, stock_amount,
  stock_unit, pos_x, pos_y, attrs_json, composition_json,
  caracteristics_json, updated_at
) VALUES (
  @id, @material_key, @type, @label, @external_id, @external_url, @image_url,
  @description, @schema_version, @name, @color_label, @industry, @stock_amount,
  @stock_unit, @pos_x, @pos_y, @attrs_json, @composition_json,
  @caracteristics_json, @updated_at
)
ON CONFLICT(id) DO UPDATE SET
  material_key = excluded.material_key,
  type = excluded.type,
  label = excluded.label,
  external_id = excluded.external_id,
  external_url = excluded.external_url,
  image_url = excluded.image_url,
  description = excluded.description,
  schema_version = excluded.schema_version,
  name = excluded.name,
  color_label = excluded.color_label,
  industry = excluded.industry,
  stock_amount = excluded.stock_amount,
  stock_unit = excluded.stock_unit,
  pos_x = excluded.pos_x,
  pos_y = excluded.pos_y,
  attrs_json = excluded.attrs_json,
  composition_json = excluded.composition_json,
  caracteristics_json = excluded.caracteristics_json,
  updated_at = excluded.updated_at;
