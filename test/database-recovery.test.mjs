import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {
  appliedMigrations,
  dropTables,
  listTables,
  missingSchemaParts,
  readSnapshot,
  repairMigrationState,
  restoreSnapshot,
} from "../src/downloader/DatabaseSchemaRecovery.ts";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/downloader/drizzle",
);

const journal = JSON.parse(
  readFileSync(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
).entries;

/** The recovery only needs these three calls, see `RecoveryClient`. */
function client(database) {
  return {
    getAllSync: source => database.prepare(source).all(),
    execSync: source => database.exec(source),
    runSync: (source, params) => database.prepare(source).run(...params),
  };
}

/**
 * Replica of the migration loop drizzle runs on the device: it skips every
 * migration that is not newer than the last recorded one and applies the rest
 * in a single transaction.
 */
function migrate(database) {
  database.exec(
    "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)",
  );
  const last = database
    .prepare(
      "SELECT created_at FROM `__drizzle_migrations` ORDER BY created_at DESC LIMIT 1",
    )
    .get();

  database.exec("BEGIN");
  try {
    for (const entry of journal) {
      if (last && Number(last.created_at) >= entry.when) {
        continue;
      }
      const statements = readFileSync(
        join(MIGRATIONS_DIR, `${entry.tag}.sql`),
        "utf8",
      ).split("--> statement-breakpoint");
      for (const statement of statements) {
        database.exec(statement);
      }
      database
        .prepare(
          "INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)",
        )
        .run(entry.tag, entry.when);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  migrate(database);
  return database;
}

function seed(database) {
  database
    .prepare("INSERT INTO `playlist` (`id`, `name`) VALUES (?, ?)")
    .run("p1", "Playlist");
  database
    .prepare("INSERT INTO `video` (`id`, `name`, `fileUrl`) VALUES (?, ?, ?)")
    .run("v1", "Video", "file:///v1.mp4");
  database
    .prepare(
      "INSERT INTO `playlist_videos` (`playlist_id`, `video_id`, `playlist_order`) VALUES (?, ?, ?)",
    )
    .run("p1", "v1", 0);
}

/** Mirrors `rebuildDatabase` from DatabaseRecovery. */
function rebuild(database, {keepData}) {
  const recovery = client(database);
  const snapshots = keepData ? readSnapshot(recovery) : [];
  dropTables(recovery, listTables(recovery));
  migrate(database);
  return keepData
    ? restoreSnapshot(recovery, snapshots)
    : {restored: 0, skipped: 0};
}

test("a freshly migrated database matches the target schema", () => {
  const database = migratedDatabase();

  assert.deepEqual(missingSchemaParts(client(database)), []);
  assert.deepEqual(
    appliedMigrations(client(database)),
    journal.map(entry => entry.when),
  );
});

test("migrations fail when the bookkeeping table was lost", () => {
  const database = migratedDatabase();
  database.exec("DROP TABLE `__drizzle_migrations`");

  assert.throws(() => migrate(database), /already exists/);
});

test("repair adopts an up to date schema so the migrations pass again", () => {
  const database = migratedDatabase();
  seed(database);
  database.exec("DROP TABLE `__drizzle_migrations`");

  const result = repairMigrationState(client(database), journal);

  assert.equal(result.repaired, true);
  assert.deepEqual(
    result.stampedMigrations,
    journal.map(entry => entry.tag),
  );
  assert.doesNotThrow(() => migrate(database));
  assert.equal(
    database.prepare("SELECT count(*) as count FROM `video`").get().count,
    1,
  );
});

test("repair removes tables left behind by an interrupted migration", () => {
  const database = migratedDatabase();
  database.exec("CREATE TABLE `__new_video` (`id` text PRIMARY KEY NOT NULL)");

  const result = repairMigrationState(client(database), journal);

  assert.deepEqual(result.droppedTables, ["__new_video"]);
  assert.equal(listTables(client(database)).includes("__new_video"), false);
});

test("repair does not adopt an incomplete schema", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(
    readFileSync(join(MIGRATIONS_DIR, `${journal[0].tag}.sql`), "utf8").replace(
      "--> statement-breakpoint",
      ";",
    ),
  );

  const result = repairMigrationState(client(database), journal);

  assert.equal(result.repaired, false);
  assert.deepEqual(result.stampedMigrations, []);
  assert.ok(result.missingSchemaParts.includes("table playlist_videos"));
  assert.deepEqual(appliedMigrations(client(database)), []);
});

test("rebuilding with keepData restores the rows of the known tables", () => {
  const database = migratedDatabase();
  seed(database);

  const result = rebuild(database, {keepData: true});

  assert.equal(result.restored, 3);
  assert.equal(result.skipped, 0);
  assert.deepEqual(missingSchemaParts(client(database)), []);
  // node:sqlite hands back null prototype rows, spread them for the compare.
  assert.deepEqual(
    database
      .prepare("SELECT `id`, `name` FROM `video`")
      .all()
      .map(row => ({...row})),
    [{id: "v1", name: "Video"}],
  );
  assert.deepEqual(
    database
      .prepare("SELECT `playlist_id` FROM `playlist_videos`")
      .all()
      .map(row => ({...row})),
    [{playlist_id: "p1"}],
  );
});

test("rebuilding an unusable database yields a working empty schema", () => {
  const database = new DatabaseSync(":memory:");
  // A database that never got its bookkeeping and only has half a schema.
  database.exec("CREATE TABLE `video` (`id` text PRIMARY KEY NOT NULL)");

  assert.throws(() => migrate(database), /already exists/);

  rebuild(database, {keepData: false});

  assert.deepEqual(missingSchemaParts(client(database)), []);
  assert.deepEqual(
    appliedMigrations(client(database)),
    journal.map(entry => entry.when),
  );
});
