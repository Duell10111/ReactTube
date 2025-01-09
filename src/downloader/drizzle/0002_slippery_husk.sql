CREATE TABLE `playlist_videos` (
	`playlist_id` text,
	`video_id` text,
	`playlist_order` integer NOT NULL,
	PRIMARY KEY(`playlist_id`, `video_id`),
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_video` (
	`id` text PRIMARY KEY NOT NULL,
	`duration` integer,
	`name` text,
	`author` text,
	`album` text,
	`coverUrl` text,
	`fileUrl` text
);
--> statement-breakpoint
INSERT INTO `__new_video`("id", "duration", "name", "author", "album", "coverUrl", "fileUrl") SELECT "id", "duration", "name", "author", "album", "coverUrl", "fileUrl" FROM `video`;--> statement-breakpoint
DROP TABLE `video`;--> statement-breakpoint
ALTER TABLE `__new_video` RENAME TO `video`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `playlist` ADD `description` text;--> statement-breakpoint
ALTER TABLE `playlist` ADD `coverUrl` text;--> statement-breakpoint
ALTER TABLE `playlist` ADD `download` integer;