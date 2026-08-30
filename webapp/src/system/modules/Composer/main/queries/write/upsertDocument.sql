INSERT INTO model_documents
  (id, document_key, model_key, kind, mime, filename, size, bytes, updated_at)
VALUES
  (@id, @document_key, @model_key, @kind, @mime, @filename, @size, @bytes, @updated_at)
ON CONFLICT(id) DO UPDATE SET
  kind = excluded.kind,
  mime = excluded.mime,
  filename = excluded.filename,
  size = excluded.size,
  bytes = excluded.bytes,
  updated_at = excluded.updated_at;
