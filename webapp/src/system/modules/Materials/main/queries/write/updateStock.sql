-- Set a material's stock. Its own statement because the stock surface edits
-- it alone, without touching anything else on the row.
UPDATE materials SET stock_amount = ?, stock_unit = ?, updated_at = ?
WHERE material_key = ?;
