-- Drop a material's whole `suppliedBy` set, before writing the new one.
DELETE FROM material_edges WHERE source_key = ? AND type = 'suppliedBy';
