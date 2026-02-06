-- Custom hints for user-created mnemonic hints with optional images
CREATE TABLE "haohaohow"."custom_hint" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"customHintId" text NOT NULL,
	"hanziWord" text NOT NULL,
	"hint" text NOT NULL,
	"explanation" text,
	"assetIds" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_hint_userId_customHintId_unique" UNIQUE("userId","customHintId")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."custom_hint" ADD CONSTRAINT "custom_hint_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_hint_userId_index" ON "haohaohow"."custom_hint" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "custom_hint_userId_hanziWord_index" ON "haohaohow"."custom_hint" USING btree ("userId","hanziWord");
