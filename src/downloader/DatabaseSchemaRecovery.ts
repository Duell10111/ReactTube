import {getTableConfig, SQLiteTable} from "drizzle-orm/sqlite-core";

import * as schema from "./schema.ts";

export const MIGRATIONS_TABLE = "__drizzle_migrations";

/**
 * Prefix drizzle uses for the helper table it creates while recreating a
 * table. Such a table only survives an interrupted migration.
 */
const TEMPORARY_TABLE_PREFIX = "__new_";

export type BindValue = string | number | boolean | null;

/**
 * The part of the expo-sqlite API the recovery needs. Keeping it minimal lets
 * the recovery run against any SQLite binding, which is what the tests use.
 */
export interface RecoveryClient {
  getAllSync<T>(source: string): T[];
  execSync(source: string): void;
  runSync(source: string, params: BindValue[]): unknown;
}

export interface JournalEntry {
  when: number;
  tag: string;
}

export interface TableSnapshot {
  name: string;
  columns: string[];
  rows: Record<string, BindValue>[];
}

export interface DatabaseDiagnostics {
  tables: {name: string; columns: string[]}[];
  appliedMigrations: number[];
  journalEntries: number[];
  missingSchemaParts: string[];
  leftoverTables: string[];
}

export interface RepairResult {
  repaired: boolean;
  droppedTables: string[];
  stampedMigrations: string[];
  missingSchemaParts: string[];
}

export interface RestoreResult {
  restored: number;
  skipped: number;
}

// Insert order matters, child tables reference their parents.
const EXPECTED_TABLES: SQLiteTable[] = [
  schema.playlists,
  schema.videos,
  schema.playlistVideos,
];

interface ExpectedTable {
  name: string;
  columns: string[];
}

function expectedSchema(): ExpectedTable[] {
  return EXPECTED_TABLES.map(table => {
    const config = getTableConfig(table);
    return {
      name: config.name,
      columns: config.columns.map(column => column.name),
    };
  });
}

function quote(identifier: string) {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

export function listTables(client: RecoveryClient): string[] {
  return client
    .getAllSync<{
      name: string;
    }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .map(row => row.name);
}

function listColumns(client: RecoveryClient, table: string): string[] {
  return client
    .getAllSync<{name: string}>(`PRAGMA table_info(${quote(table)})`)
    .map(row => row.name);
}

export function appliedMigrations(client: RecoveryClient): number[] {
  if (!listTables(client).includes(MIGRATIONS_TABLE)) {
    return [];
  }
  return client
    .getAllSync<{
      created_at: number;
    }>(
      `SELECT created_at FROM ${quote(MIGRATIONS_TABLE)} ORDER BY created_at ASC`,
    )
    .map(row => Number(row.created_at));
}

/**
 * Parts of the target schema that are physically missing. An empty result
 * means the database already looks like the newest migration, even when the
 * migration bookkeeping disagrees.
 */
export function missingSchemaParts(client: RecoveryClient): string[] {
  const tables = listTables(client);
  const missing: string[] = [];

  for (const expected of expectedSchema()) {
    if (!tables.includes(expected.name)) {
      missing.push(`table ${expected.name}`);
      continue;
    }
    const columns = listColumns(client, expected.name);
    for (const column of expected.columns) {
      if (!columns.includes(column)) {
        missing.push(`${expected.name}.${column}`);
      }
    }
  }

  return missing;
}

export function leftoverTables(client: RecoveryClient): string[] {
  return listTables(client).filter(table =>
    table.startsWith(TEMPORARY_TABLE_PREFIX),
  );
}

export function collectDiagnostics(
  client: RecoveryClient,
  journal: JournalEntry[],
): DatabaseDiagnostics {
  return {
    tables: listTables(client).map(name => ({
      name,
      columns: listColumns(client, name),
    })),
    appliedMigrations: appliedMigrations(client),
    journalEntries: journal.map(entry => entry.when),
    missingSchemaParts: missingSchemaParts(client),
    leftoverTables: leftoverTables(client),
  };
}

export function describeDiagnostics(diagnostics: DatabaseDiagnostics): string {
  const tables = diagnostics.tables
    .map(table => `${table.name}(${table.columns.join(", ")})`)
    .join("\n");

  return [
    `applied migrations: ${diagnostics.appliedMigrations.join(", ") || "none"}`,
    `bundled migrations: ${diagnostics.journalEntries.join(", ")}`,
    `missing schema parts: ${
      diagnostics.missingSchemaParts.join(", ") || "none"
    }`,
    `leftover tables: ${diagnostics.leftoverTables.join(", ") || "none"}`,
    `tables:\n${tables || "none"}`,
  ].join("\n");
}

export function dropTables(client: RecoveryClient, tables: string[]) {
  if (tables.length === 0) {
    return;
  }
  client.execSync("PRAGMA foreign_keys=OFF");
  try {
    for (const table of tables) {
      client.execSync(`DROP TABLE IF EXISTS ${quote(table)}`);
    }
  } finally {
    client.execSync("PRAGMA foreign_keys=ON");
  }
}

/**
 * Marks migrations as applied without executing them. Only safe when the
 * database already contains the full target schema, e.g. when the bookkeeping
 * table was lost while the tables themselves survived.
 */
function stampMigrations(client: RecoveryClient, entries: JournalEntry[]) {
  client.execSync(
    `CREATE TABLE IF NOT EXISTS ${quote(MIGRATIONS_TABLE)} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
  );
  for (const entry of entries) {
    client.runSync(
      `INSERT INTO ${quote(MIGRATIONS_TABLE)} ("hash", "created_at") VALUES (?, ?)`,
      [entry.tag, entry.when],
    );
  }
}

/**
 * Non destructive recovery: removes leftovers of an interrupted migration and
 * realigns the migration bookkeeping with the schema that is actually present.
 * `repaired` tells whether anything changed, i.e. whether a retry makes sense.
 */
export function repairMigrationState(
  client: RecoveryClient,
  journal: JournalEntry[],
): RepairResult {
  const droppedTables = leftoverTables(client);
  dropTables(client, droppedTables);

  const missing = missingSchemaParts(client);
  let stampedMigrations: string[] = [];

  if (missing.length === 0) {
    const applied = appliedMigrations(client);
    const unstamped = journal.filter(entry => !applied.includes(entry.when));
    stampMigrations(client, unstamped);
    stampedMigrations = unstamped.map(entry => entry.tag);
  }

  return {
    repaired: droppedTables.length > 0 || stampedMigrations.length > 0,
    droppedTables,
    stampedMigrations,
    missingSchemaParts: missing,
  };
}

/**
 * Reads the rows of the known tables so they can be inserted again after the
 * schema was rebuilt. Columns the target schema does not know are dropped,
 * unreadable tables are skipped.
 */
export function readSnapshot(
  client: RecoveryClient,
  onError?: (table: string, error: unknown) => void,
): TableSnapshot[] {
  const tables = listTables(client);
  const snapshots: TableSnapshot[] = [];

  for (const expected of expectedSchema()) {
    if (!tables.includes(expected.name)) {
      continue;
    }
    const columns = listColumns(client, expected.name).filter(column =>
      expected.columns.includes(column),
    );
    if (columns.length === 0) {
      continue;
    }
    try {
      const rows = client.getAllSync<Record<string, BindValue>>(
        `SELECT ${columns.map(quote).join(", ")} FROM ${quote(expected.name)}`,
      );
      snapshots.push({name: expected.name, columns, rows});
    } catch (error) {
      onError?.(expected.name, error);
    }
  }

  return snapshots;
}

export function restoreSnapshot(
  client: RecoveryClient,
  snapshots: TableSnapshot[],
  onError?: (table: string, error: unknown) => void,
): RestoreResult {
  let restored = 0;
  let skipped = 0;

  for (const snapshot of snapshots) {
    const statement = `INSERT OR IGNORE INTO ${quote(snapshot.name)} (${snapshot.columns
      .map(quote)
      .join(", ")}) VALUES (${snapshot.columns.map(() => "?").join(", ")})`;
    for (const row of snapshot.rows) {
      try {
        client.runSync(
          statement,
          snapshot.columns.map(column => row[column] ?? null),
        );
        restored++;
      } catch (error) {
        skipped++;
        onError?.(snapshot.name, error);
      }
    }
  }

  return {restored, skipped};
}
