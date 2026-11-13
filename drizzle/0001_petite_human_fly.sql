ALTER TABLE `campaigns` ADD `currency` text DEFAULT 'COP' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `usd_value_cents` integer;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `exchange_rate` real;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `exchange_rate_date` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `usd_amount_cents` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `exchange_rate` real;--> statement-breakpoint
ALTER TABLE `payments` ADD `exchange_rate_date` text;