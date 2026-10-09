ALTER TABLE "attempts" ADD COLUMN "task_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "graph_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "rule_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "topic_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "skill_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "option_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "selected_option_id" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "response_ms" integer;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "task_version" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "attempt_no" integer;--> statement-breakpoint
CREATE INDEX "lesson_idx" ON "attempts" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "user_lesson_idx" ON "attempts" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "task_idx" ON "attempts" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "rule_idx" ON "attempts" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "topic_idx" ON "attempts" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "graph_idx" ON "attempts" USING btree ("graph_id");