import {eq} from "drizzle-orm";
import {drizzle, useLiveQuery} from "drizzle-orm/expo-sqlite";
import {useMigrations} from "drizzle-orm/expo-sqlite/migrator";
import {openDatabaseSync} from "expo-sqlite/next";
import {useEffect, useState} from "react";

import migrations from "./drizzle/migrations";
import * as schema from "./schema";

const expoDb = openDatabaseSync("downloadDB.db", {enableChangeListener: true});
export const db = drizzle(expoDb);

export function useMigration() {
  return useMigrations(db, migrations);
}

export function findVideo(id: string) {
  return db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.id, id))
    .limit(1)
    .execute();
}

export function useVideo(id: string) {
  const [video, setVideo] = useState<{
    name: string;
    id: string;
    fileUrl: string;
    playlistId: string;
  }>();

  useEffect(() => {
    db.select()
      .from(schema.videos)
      .where(eq(schema.videos.id, id))
      .limit(1)
      .execute()
      .then(v => {
        setVideo(v[0]);
      });
  }, []);

  return video;
}

export function useVideos() {
  const {data, error, updatedAt} = useLiveQuery(
    db.select().from(schema.videos),
  );
  //
  // useEffect(() => {
  //   db.select()
  //     .from(schema.videos)
  //     .execute()
  //     .then(data => console.log("DATA: ", data));
  // }, []);

  updatedAt && console.log("Updated at: ", updatedAt);
  error && console.error(error);

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
  duration: number,
  dirURL: string,
  playlistID?: string,
) {
  await db
    .insert(schema.videos)
    .values({
      id,
      name,
      fileUrl: dirURL,
      playlistId: playlistID,
      duration,
    })
    .onConflictDoUpdate({
      target: schema.videos.id,
      set: {
        id,
        name,
        fileUrl: dirURL,
        playlistId: playlistID,
        duration,
      },
    })
    .execute();

  console.log("Inserted video");
}

export async function insertPlaylist(
  id: string,
  name: string,
  videoIds: string[],
) {
  await db
    .insert(schema.playlists)
    .values({
      id,
      name,
    })
    .onConflictDoUpdate({
      target: schema.videos.id,
      set: {
        id,
        name,
      },
    })
    .execute();

  const videos = videoIds.map(videoId => {
    return db
      .insert(schema.playlistVideos)
      .values({
        videoId,
        playlistId: id,
      })
      .onConflictDoUpdate({
        target: schema.playlistVideos.videoId,
        set: {
          videoId,
          playlistId: id,
        },
      })
      .execute();
  });

  console.log("Inserted playlist");
}
