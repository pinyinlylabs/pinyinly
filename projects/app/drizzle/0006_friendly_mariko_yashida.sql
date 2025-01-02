CREATE TABLE "haohaohow"."replicacheMutation" (
	"id" text PRIMARY KEY NOT NULL,
	"clientId" text NOT NULL,
	"mutation" json NOT NULL,
	"success" boolean,
	"processedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."replicacheMutation" ADD CONSTRAINT "replicacheMutation_clientId_replicacheClient_id_fk" FOREIGN KEY ("clientId") REFERENCES "haohaohow"."replicacheClient"("id") ON DELETE no action ON UPDATE no action;