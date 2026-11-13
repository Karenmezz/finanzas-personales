CREATE TABLE `finance_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bills` ADD `recurring_id` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `manual_override` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `income_type` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `recurring_id` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `manual_override` integer DEFAULT false NOT NULL;
--> statement-breakpoint
-- One-time classification of existing income records; amounts and payment history remain unchanged.
UPDATE campaigns SET income_type = 'personal'
WHERE id LIKE 'recurring-salary-%'
   OR brand IN (SELECT brand FROM campaigns WHERE id LIKE 'recurring-salary-%');
