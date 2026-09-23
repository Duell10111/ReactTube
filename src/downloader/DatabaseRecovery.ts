import {migrate} from "drizzle-orm/expo-sqlite/migrator";

import {
  collectDiagnostics as collectDiagnosticsFor,
  describeDiagnostics,
  dropTables,
  listTables,
  readSnapshot,
  repairMigrationState as repairMigrationStateOf,
  restoreSnapshot,
  type JournalEntry,
} from "./DatabaseSchemaRecovery";
import {db, expoDb} from "./database";
import migrations from "./drizzle/migrations";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("DB-RECOVERY");

const journal: JournalEntry[] = migrations.journal.entries;

export function runMigrations() {
  return migrate(db, migrations);
}

export function describeDatabase(): string {
  return describeDiagnostics(collectDiagnosticsFor(expoDb, journal));
}

/**
 * Non destructive recovery attempt, see `repairMigrationState` in
 * DatabaseSchemaRecovery. Returns whether retrying the migrations makes sense.
 */
export function repairMigrationState(): boolean {
  const result = repairMigrationStateOf(expoDb, journal);

  if (result.droppedTables.length > 0) {
    LOGGER.warn("Dropped leftover migration tables: ", result.droppedTables);
  }
  if (result.stampedMigrations.length > 0) {
    LOGGER.warn(
      "Schema is up to date, marked migrations as applied: ",
      result.stampedMigrations,
    );
  }
  if (result.missingSchemaParts.length > 0) {
    LOGGER.warn(
      "Schema is incomplete, cannot realign migrations: ",
      result.missingSchemaParts,
    );
  }

  return result.repaired;
}

/**
 * Destructive recovery: rebuilds the database from scratch. With `keepData`
 * the rows of the known tables are read out first and inserted again
 * afterwards on a best effort basis.
 */
export async function rebuildDatabase({keepData}: {keepData: boolean}) {
  const snapshots = keepData
    ? readSnapshot(expoDb, (table, error) =>
        LOGGER.warn(`Could not read rows of ${table}: `, error),
      )
    : [];

  if (keepData) {
    LOGGER.info(
      "Rescued rows before rebuild: ",
      snapshots.map(snapshot => `${snapshot.name}=${snapshot.rows.length}`),
    );
  }

  dropTables(expoDb, listTables(expoDb));
  await runMigrations();

  if (!keepData) {
    return {restored: 0, skipped: 0};
  }

  return restoreSnapshot(expoDb, snapshots, (table, error) =>
    LOGGER.warn(`Could not restore a row of ${table}: `, error),
  );
}
