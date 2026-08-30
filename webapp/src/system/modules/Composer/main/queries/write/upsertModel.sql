-- Insert or replace, for the projection carrying models across from Jazz.
INSERT INTO models (id, model_key, name, description, graph_json, svg, updated_at)
VALUES (@id, @model_key, @name, @description, @graph_json, @svg, @updated_at)
ON CONFLICT(id) DO UPDATE SET
  model_key = excluded.model_key,
  name = excluded.name,
  description = excluded.description,
  graph_json = excluded.graph_json,
  svg = excluded.svg,
  updated_at = excluded.updated_at;
