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
 * `model_edit_leases` is absent on purpose: a lease describes a live session
 * on this peer, and merging one in from elsewhere would lock a model nobody is
 * editing.
 */
export const MODELS_REPLICATED_TABLES = ["models", "model_documents"] as const;
