DROP INDEX "haohaohow"."replicacheMutation_clientId_index";--> statement-breakpoint
ALTER TABLE "haohaohow"."replicacheMutation" ALTER COLUMN "mutationId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "haohaohow"."replicacheMutation" ADD CONSTRAINT "replicacheMutation_clientId_mutationId_unique" UNIQUE("clientId","mutationId");