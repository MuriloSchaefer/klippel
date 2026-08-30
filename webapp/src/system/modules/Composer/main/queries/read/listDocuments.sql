-- Attachment metadata only — the bytes stay in the table until asked for.
SELECT document_key, kind, mime, filename, size, updated_at
FROM model_documents WHERE model_key = ?;
