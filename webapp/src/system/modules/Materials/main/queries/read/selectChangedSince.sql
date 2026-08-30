-- Rows written since a client's watermark — the delta's changed set.
SELECT * FROM materials WHERE updated_at > ?;
