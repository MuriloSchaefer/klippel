-- Keyed by the domain id, which is what a search joins back to and what the
-- answer has to return.
INSERT INTO materials_fts (id, haystack) VALUES (?, ?);
