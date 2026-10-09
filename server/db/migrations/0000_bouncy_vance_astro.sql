CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"node_id" text,
	"type" text NOT NULL,
	"is_correct" boolean DEFAULT false,
	"answer" text,
	"score" integer DEFAULT 0,
	"client_timestamp" timestamp,
	"created_at" timestamp DEFAULT now()
);
