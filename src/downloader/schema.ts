import {sqliteTable, text, integer} from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("video", {
  id: text("id").primaryKey(),
  duration: integer("duration"),
  name: text("name"),
  fileUrl: text("fileUrl").notNull(),
  playlistId: text("playlist_id").references(() => playlists.id),
});

export type Video = typeof videos.$inferSelect; // return type when queried
export type VideoInsert = typeof videos.$inferInsert; // return type when inserted

export const playlists = sqliteTable("playlist", {
  id: text("id").primaryKey(),
  name: text("name"),
});

export type Playlist = typeof playlists.$inferSelect; // return type when queried

export const playlistVideos = sqliteTable("playlist_videos", {
  playlistId: text("playlist_id")
    .primaryKey()
    .references(() => playlists.id),
  videoId: text("video_id").references(() => videos.id),
});
