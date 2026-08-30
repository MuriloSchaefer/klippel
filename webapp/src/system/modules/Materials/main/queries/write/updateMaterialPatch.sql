-- Apply a partial edit to one material.
--
-- Every column is `COALESCE(@param, column)`, so a parameter bound to NULL
-- means "leave this alone" and anything else — including the empty string —
-- is a real value. That keeps the statement static: the alternative is
-- assembling a SET clause per call, which cannot be prepared once, cannot be
-- read as SQL, and puts string concatenation on the write path.
UPDATE materials SET
  type = COALESCE(@type, type),
  label = COALESCE(@label, label),
  external_id = COALESCE(@external_id, external_id),
  external_url = COALESCE(@external_url, external_url),
  image_url = COALESCE(@image_url, image_url),
  description = COALESCE(@description, description),
  schema_version = COALESCE(@schema_version, schema_version),
  name = COALESCE(@name, name),
  color_label = COALESCE(@color_label, color_label),
  industry = COALESCE(@industry, industry),
  stock_amount = COALESCE(@stock_amount, stock_amount),
  stock_unit = COALESCE(@stock_unit, stock_unit),
  attrs_json = COALESCE(@attrs_json, attrs_json),
  composition_json = COALESCE(@composition_json, composition_json),
  caracteristics_json = COALESCE(@caracteristics_json, caracteristics_json),
  updated_at = @updated_at
WHERE material_key = @material_key;
