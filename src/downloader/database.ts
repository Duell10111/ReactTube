import {drizzle} from "drizzle-orm/expo-sqlite";
import {openDatabaseSync} from "expo-sqlite";

export const DATABASE_NAME = "downloadDB.db";

/**
 * Raw expo-sqlite handle. Only needed for maintenance tasks that cannot be
 * expressed through drizzle (schema inspection, recovery, resets).
 */
export const expoDb = openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

export const db = drizzle(expoDb);
