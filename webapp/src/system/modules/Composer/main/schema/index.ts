/**
 * The Composer module's contribution to the workspace database.
 *
 * Same shape as the Materials module's: the DDL is SQL beside this file,
 * inlined at build time, and the kernel only runs it. Migrations are
 * append-only, and this module's entries come after the catalog's — the index
 * of a migration in the aggregated list is the `user_version` it advances to,
 * so appending is the only safe edit.
 */
import modelsV1 from "./models.sql?raw";

/** Ordered, append-only. */
export const MODELS_MIGRATIONS: readonly string[] = [modelsV1];

/**
 * Tables `crsql_as_crr` is applied to when the extension is present.
 *
 * `model_edit_leases` included: a lease is only a lock if the other peer can
 * see it, and under Jazz it synced. The obvious objection — a peer that goes
 * offline holding one would lock the model forever — is answered by the TTL
 * the lease already carries: every reader treats an expired lease as absent,
 * so a dead holder's lock clears itself in `LEASE_TTL_MS` whether or not that
 * peer ever comes back.
 */
export const MODELS_REPLICATED_TABLES = [
  "models",
  "model_documents",
  "model_edit_leases",
] as const;
