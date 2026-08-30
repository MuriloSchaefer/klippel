-- Enough to write against a model without reading its graph.
SELECT id, model_key FROM models WHERE model_key = ?;
