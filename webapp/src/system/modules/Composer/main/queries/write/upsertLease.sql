INSERT INTO model_edit_leases
  (model_key, holder_account_id, acquired_at, expires_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(model_key) DO UPDATE SET
  holder_account_id = excluded.holder_account_id,
  acquired_at = excluded.acquired_at,
  expires_at = excluded.expires_at;
