CREATE INDEX "replicacheClient_clientGroupId_index" ON "haohaohow"."replicacheClient" USING btree ("clientGroupId");--> statement-breakpoint
CREATE INDEX "replicacheClientGroup_userId_index" ON "haohaohow"."replicacheClientGroup" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "replicacheMutation_clientId_index" ON "haohaohow"."replicacheMutation" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "skillRating_userId_skillId_index" ON "haohaohow"."skillRating" USING btree ("userId","skillId");