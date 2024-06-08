import {eq} from "drizzle-orm";
import {drizzle, useLiveQuery} from "drizzle-orm/expo-sqlite";
import {openDatabaseSync} from "expo-sqlite/next";

import * as schema from "./schema";

const expoDb = openDatabaseSync("downloadDB.db", {enableChangeListener: true});
export const db = drizzle(expoDb);

export function useVideos() {
  const {data, error} = useLiveQuery(db.select().from(schema.videos));

  console.error(error);

  return data;
}

export function usePlaylistVideos(id: string) {
  const {data} = useLiveQuery(
    db
      .select()
      .from(schema.videos)
      .leftJoin(
        schema.playlists,
        eq(schema.videos.playlistId, schema.playlists.id),
      )
      .where(eq(schema.playlists.id, id)),
  );

  return data;
}

export async function insertVideo(
  id: string,
  name: string,
  dirURL: string,
  playlistID?: string,
) {
  await db
    .insert(schema.videos)
    .values({id, name, fileUrl: dirURL, playlistId: playlistID});
}
