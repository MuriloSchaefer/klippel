-- One model, whole. `graph_json` included: this is the load path.
SELECT model_key, id, name, description, graph_json, updated_at,
       CASE WHEN svg = '' THEN 0 ELSE 1 END AS has_svg
FROM models WHERE model_key = ?;
