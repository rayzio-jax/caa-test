CREATE TYPE "public"."status" AS ENUM('QUEUE', 'HANDLED', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar(255) NOT NULL,
	"channel_id" varchar(255) NOT NULL,
	"agent_id" varchar(255),
	"status" "status" DEFAULT 'QUEUE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
