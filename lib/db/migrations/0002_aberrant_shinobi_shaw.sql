ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "walletAddress" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_walletAddress_unique" UNIQUE("walletAddress");