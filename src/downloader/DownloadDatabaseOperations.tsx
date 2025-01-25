import {
  and,
  desc,
  eq,
  getTableColumns,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import {drizzle, useLiveQuery} from "drizzle-orm/expo-sqlite";
import {useMigrations} from "drizzle-orm/expo-sqlite/migrator";
import {openDatabaseSync} from "expo-sqlite";
import {useEffect, useState} from "react";

import migrations from "./drizzle/migrations";
import * as schema from "./schema";
import {Video} from "./schema";

const expoDb = openDatabaseSync("downloadDB.db", {enableChangeListener: true});
export const db = drizzle(expoDb);

export function useMigration() {
  return useMigrations(db, migrations);
}

export async function findVideo(id: string): Promise<Video | undefined> {
  const result = await db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.id, id))
    .limit(1)
    .execute();
  return result[0];
}

export function useVideo(id: string) {
  const [video, setVideo] = useState<schema.Video>();

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

export function useDownloadedVideos() {
  const {data} = useLiveQuery(
    db.select().from(schema.videos).where(isNotNull(schema.videos.fileUrl)),
  );

  return data;
}

export async function createPlaylist(
  id: string,
  name: string,
  description?: string,
  coverUrl?: string,
  downloaded?: boolean,
) {
  await db
    .insert(schema.playlists)
    .values({
      id,
      name,
      description,
      coverUrl,
      download: downloaded,
    })
    .onConflictDoUpdate({
      target: schema.playlists.id,
      set: {
        id,
        name,
        description,
        coverUrl,
        download: downloaded,
      },
    })
    .execute();
}

export function usePlaylistVideos(id: string) {
  const {data} = useLiveQuery(
    db
      .select(getTableColumns(schema.videos))
      .from(schema.videos)
      .innerJoin(
        schema.playlistVideos,
        eq(schema.videos.id, schema.playlistVideos.videoId),
      )
      .where(eq(schema.playlistVideos.playlistId, id))
      .orderBy(desc(schema.playlistVideos.playlistOrder)),
  );
  console.log(data);

  return data;
}

export async function insertVideo(
  id: string,
  name: string,
  duration?: number, // No update on undefined
  coverUrl?: string,
  dirURL?: string,
  playlistID?: string,
  author?: string,
) {
  // await db
  //   .insert(schema.videos)
  //   .values({
  //     id,
  //     name,
  //     fileUrl: dirURL,
  //     duration,
  //   })
  //   .onConflictDoUpdate({
  //     target: schema.videos.id,
  //     set: {
  //       id,
  //       name,
  //       fileUrl: dirURL,
  //       duration,
  //     },
  //   });

  // Get all videos from a playlist
  const result = await db
    .select({
      count: sql<number>`cast(count(${schema.playlistVideos.videoId}) as int)`,
    })
    .from(schema.playlistVideos)
    .where(eq(schema.playlistVideos.playlistId, id));
  console.log("Count: ", result[0].count);

  await db.transaction(async tx => {
    await tx
      .insert(schema.videos)
      .values({
        id,
        name,
        coverUrl,
        fileUrl: dirURL,
        duration,
        author,
      })
      .onConflictDoUpdate({
        target: schema.videos.id,
        set: {
          id,
          name,
          coverUrl,
          fileUrl: dirURL,
          duration,
          author,
        },
      });
    if (playlistID) {
      await tx
        .insert(schema.playlistVideos)
        .values({
          videoId: id,
          playlistId: playlistID,
          playlistOrder: result[0].count,
        })
        .onConflictDoNothing();
    }
  });

  console.log("Inserted video");
}

export async function checkIfVideoIsInPlaylist(id: string) {
  const results = await db
    .select({count: sql`count(*)`.mapWith(Number)})
    .from(schema.videos)
    .innerJoin(
      schema.playlistVideos,
      eq(schema.videos.id, schema.playlistVideos.videoId),
    )
    .where(eq(schema.videos.id, id))
    .execute();

  console.log("VideoInPlaylist Result: ", results);

  return results[0].count > 0;
}

export async function deleteVideo(id: string) {
  await db.delete(schema.videos).where(eq(schema.videos.id, id)).execute();
}

export async function deleteVideoLocalFileReferences(
  id: string,
  coverURLReplacement?: string,
) {
  await db
    .update(schema.videos)
    .set({
      fileUrl: null,
      coverUrl: coverURLReplacement ?? null,
    })
    .where(eq(schema.videos.id, id))
    .execute();
}

export async function deleteZombieVideos() {
  const zombieResult = await db
    .select()
    .from(schema.videos)
    .leftJoin(
      schema.playlistVideos,
      eq(schema.videos.id, schema.playlistVideos.videoId),
    )
    .where(isNull(schema.playlistVideos.videoId))
    .execute();

  console.log("Zombie Videos: ", zombieResult);
}

export async function insertVideosIntoPlaylist(
  playlistID: string,
  videoIds: string[],
) {
  console.log("TEST");
  const all = videoIds.map(async videoId => {
    // Get all videos from a playlist
    const result = await db
      .select({
        count: sql<number>`cast(count(
            ${schema.playlistVideos.videoId}
            )
            as
            int
            )`,
      })
      .from(schema.playlistVideos)
      .where(eq(schema.playlistVideos.playlistId, playlistID))
      .execute();

    console.log(result);
    console.log(result[0].count);

    await db
      .insert(schema.playlistVideos)
      .values({
        videoId,
        playlistId: playlistID,
        playlistOrder: result[0].count,
      })
      .onConflictDoNothing()
      .execute();
  });
  await Promise.all(all);
}

export async function removeVideosIntoPlaylist(
  playlistID: string,
  videoIds: string[],
) {
  await Promise.all(
    videoIds.map(videoId => {
      db.delete(schema.playlistVideos)
        .where(
          and(
            eq(schema.playlistVideos.playlistId, playlistID),
            eq(schema.playlistVideos.videoId, videoId),
          ),
        )
        .execute();
    }),
  );
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

  const videos = videoIds.map((videoId, index) => {
    return db
      .insert(schema.playlistVideos)
      .values({
        videoId,
        playlistId: id,
        playlistOrder: index,
      })
      .onConflictDoUpdate({
        target: schema.playlistVideos.videoId,
        set: {
          videoId,
          playlistId: id,
          playlistOrder: index,
        },
      })
      .execute();
  });

  console.log("Inserted playlist");
}

export function deletePlaylist(id: string) {
  return db
    .delete(schema.playlists)
    .where(eq(schema.playlists.id, id))
    .execute();
}

export async function getAllPlaylists() {
  return db.select().from(schema.playlists).execute();
}

export async function getPlaylist(id: string) {
  const result = await db
    .select()
    .from(schema.playlists)
    .where(eq(schema.playlists.id, id))
    .execute();
  return result[0];
}

export async function getPlaylistVideos(id: string) {
  return await db
    .select(getTableColumns(schema.videos))
    .from(schema.videos)
    .innerJoin(
      schema.playlistVideos,
      eq(schema.videos.id, schema.playlistVideos.videoId),
    )
    .where(eq(schema.playlistVideos.playlistId, id))
    .orderBy(desc(schema.playlistVideos.playlistOrder))
    .execute();
}

export function usePlaylists() {
  const {data} = useLiveQuery(db.select().from(schema.playlists));
  return data;
}

export function usePlaylist(id: string) {
  const {data} = useLiveQuery(
    db.select().from(schema.playlists).where(eq(schema.playlists.id, id)),
  );
  return data?.[0];
}
