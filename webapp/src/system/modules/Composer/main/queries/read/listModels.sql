-- The model list, as the picker renders it. Never touches `graph_json`: the
-- list drags nothing it does not show, which is what the Jazz `ModelSummary`
-- projection existed to achieve and what a column list gives for free.
SELECT model_key, id, name, description, updated_at,
       CASE WHEN svg = '' THEN 0 ELSE 1 END AS has_svg
FROM models
ORDER BY updated_at DESC, model_key ASC;
