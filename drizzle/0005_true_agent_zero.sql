CREATE TABLE IF NOT EXISTS `personal_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`reference_url` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
