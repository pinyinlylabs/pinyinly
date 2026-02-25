ALTER TABLE "haohaohow"."asset" DROP CONSTRAINT "asset_userId_assetId_unique";--> statement-breakpoint
ALTER TABLE "haohaohow"."asset" ADD CONSTRAINT "asset_assetId_unique" UNIQUE("assetId");