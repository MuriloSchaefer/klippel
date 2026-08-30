/**
 * What the workspace database is made of, gathered from the modules that own
 * it.
 *
 * The kernel runs migrations and upgrades replicated tables; it does not
 * define any. Each module keeps its own DDL as SQL beside its main-process
 * code (`Materials/main/schema/catalog.sql`) and exports it here, so the
 * schema of a table lives with the code that reads and writes it.
 *
 * Order matters and is append-only: the index of a migration in `MIGRATIONS`
 * is the `user_version` it advances the database to, so a new module's tables
 * are appended rather than interleaved.
 */
import {
  CATALOG_MIGRATIONS,
  CATALOG_REPLICATED_TABLES,
} from "../../../src/system/modules/Materials/main/schema";

/** Every migration, in the order they must be applied. */
export const MIGRATIONS: readonly string[] = [...CATALOG_MIGRATIONS];

/** Tables `crsql_as_crr` is applied to when cr-sqlite is present. */
export const REPLICATED_TABLES: readonly string[] = [
  ...CATALOG_REPLICATED_TABLES,
];
