-- User-uploaded assets (images for mnemonics)
CREATE TABLE "haohaohow"."asset" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"assetId" text NOT NULL,
	"status" text NOT NULL,
	"contentType" text NOT NULL,
	"contentLength" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"uploadedAt" timestamp,
	"errorMessage" text,
	CONSTRAINT "asset_userId_assetId_unique" UNIQUE("userId","assetId")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."asset" ADD CONSTRAINT "asset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_userId_index" ON "haohaohow"."asset" USING btree ("userId");
