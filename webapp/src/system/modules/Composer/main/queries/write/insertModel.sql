-- A new model. Not an upsert: creating one that exists is a caller bug.
INSERT INTO models (id, model_key, name, description, graph_json, svg, updated_at)
VALUES (@id, @model_key, @name, @description, @graph_json, '', @updated_at);
