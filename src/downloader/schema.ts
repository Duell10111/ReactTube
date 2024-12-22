import {sqliteTable, text, integer, primaryKey} from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("video", {
  id: text("id").primaryKey(),
  duration: integer("duration"),
  name: text("name"),
  // Music Properties
  author: text("author"),
  // TODO: Add Author ID?
  album: text("album"),
  coverUrl: text("coverUrl"),
  fileUrl: text("fileUrl"),
});

export type Video = typeof videos.$inferSelect; // return type when queried
export type VideoInsert = typeof videos.$inferInsert; // return type when inserted

export const playlists = sqliteTable("playlist", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  coverUrl: text("coverUrl"),
  download: integer("download", {mode: "boolean"}),
});

export type Playlist = typeof playlists.$inferSelect; // return type when queried

export const playlistVideos = sqliteTable(
  "playlist_videos",
  {
    playlistId: text("playlist_id").references(() => playlists.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
    videoId: text("video_id").references(() => videos.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
    playlistOrder: integer("playlist_order").notNull(),
  },
  table => {
    return {
      pk: primaryKey({
        columns: [table.playlistId, table.videoId],
      }),
    };
  },
);

export type PlaylistVideo = typeof playlistVideos.$inferSelect;
