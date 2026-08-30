-- Every model's graph. The usage projection walks these to count which
-- materials are referenced, which is the one read that legitimately wants them
-- all.
SELECT model_key, graph_json FROM models;
