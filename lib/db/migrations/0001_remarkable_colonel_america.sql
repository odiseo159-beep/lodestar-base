CREATE TABLE "creators_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"githubHandle" text NOT NULL,
	"farcasterFid" integer,
	"farcasterUsername" text,
	"verifiedAddresses" jsonb,
	"baseContractCount" integer DEFAULT 0,
	"baseTxCount" integer DEFAULT 0,
	"data" jsonb,
	"fetchedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creators_cache_githubHandle_unique" UNIQUE("githubHandle")
);
