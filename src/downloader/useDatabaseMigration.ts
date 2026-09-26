import {useCallback, useEffect, useRef, useState} from "react";

import {
  describeDatabase,
  rebuildDatabase,
  repairMigrationState,
  runMigrations,
} from "./DatabaseRecovery";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("DB-MIGRATION");

export type DatabaseMigrationPhase =
  | "migrating"
  | "repairing"
  | "ready"
  | "failed";

export interface DatabaseMigrationState {
  phase: DatabaseMigrationPhase;
  /** True once the schema is usable. */
  success: boolean;
  error?: Error;
  /** Schema/bookkeeping dump, shown on the error screen and useful in reports. */
  diagnostics?: string;
  /** Set when the app only started because a recovery step kicked in. */
  recovered: boolean;
  /** Run the migrations again without touching any data. */
  retry: () => void;
  /** Rebuild the schema and carry the existing rows over. */
  repair: () => void;
  /** Rebuild the schema and drop all local metadata. */
  reset: () => void;
}

type RunMode = "initial" | "retry" | "repair" | "reset";

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function safeDiagnostics() {
  try {
    return describeDatabase();
  } catch (error) {
    return `diagnostics unavailable: ${toError(error).message}`;
  }
}

/**
 * Runs the drizzle migrations and, when they fail, tries to get the database
 * back into a usable state instead of leaving the app stuck on an error screen:
 *
 * 1. leftovers of an interrupted migration are removed and the migration
 *    bookkeeping is realigned with the schema that is actually present
 *    (automatic, non destructive)
 * 2. if that is not enough the caller can rebuild the schema, either keeping
 *    the existing rows (`repair`) or dropping them (`reset`)
 */
export function useDatabaseMigration(): DatabaseMigrationState {
  const [phase, setPhase] = useState<DatabaseMigrationPhase>("migrating");
  const [error, setError] = useState<Error>();
  const [diagnostics, setDiagnostics] = useState<string>();
  const [recovered, setRecovered] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (mode: RunMode) => {
    if (running.current) {
      return;
    }
    running.current = true;
    setPhase(
      mode === "initial" || mode === "retry" ? "migrating" : "repairing",
    );
    setError(undefined);

    try {
      if (mode === "repair" || mode === "reset") {
        const result = await rebuildDatabase({keepData: mode === "repair"});
        LOGGER.info(`Database rebuilt (${mode}): `, result);
        if (mounted.current) {
          setRecovered(true);
          setDiagnostics(undefined);
          setPhase("ready");
        }
        return;
      }

      await runMigrations();
      if (mounted.current) {
        setDiagnostics(undefined);
        setPhase("ready");
      }
    } catch (initialError) {
      const details = safeDiagnostics();
      LOGGER.error("Database migration failed: ", initialError);
      LOGGER.error(details);

      if (mode === "repair" || mode === "reset") {
        if (mounted.current) {
          setError(toError(initialError));
          setDiagnostics(details);
          setPhase("failed");
        }
        return;
      }

      // Automatic, non destructive recovery attempt before giving up.
      try {
        if (repairMigrationState()) {
          await runMigrations();
          LOGGER.warn("Database recovered after repairing migration state");
          if (mounted.current) {
            setRecovered(true);
            setDiagnostics(undefined);
            setPhase("ready");
          }
          return;
        }
      } catch (repairError) {
        LOGGER.error("Automatic database repair failed: ", repairError);
      }

      if (mounted.current) {
        setError(toError(initialError));
        // Recovery may have changed the picture, so take a fresh look.
        setDiagnostics(safeDiagnostics());
        setPhase("failed");
      }
    } finally {
      running.current = false;
    }
  }, []);

  const start = useCallback(
    (mode: RunMode) => {
      run(mode).catch(runError => {
        LOGGER.error(`Unexpected failure while running ${mode}: `, runError);
      });
    },
    [run],
  );

  useEffect(() => {
    start("initial");
  }, [start]);

  return {
    phase,
    success: phase === "ready",
    error,
    diagnostics,
    recovered,
    retry: useCallback(() => start("retry"), [start]),
    repair: useCallback(() => start("repair"), [start]),
    reset: useCallback(() => start("reset"), [start]),
  };
}
