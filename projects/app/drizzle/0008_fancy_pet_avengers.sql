CREATE TABLE "haohaohow"."pinyinFinalAssociation" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"final" text NOT NULL,
	"name" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pinyinFinalAssociation_userId_final_unique" UNIQUE("userId","final")
);
--> statement-breakpoint
CREATE TABLE "haohaohow"."pinyinInitialAssociation" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"initial" text NOT NULL,
	"name" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pinyinInitialAssociation_userId_initial_unique" UNIQUE("userId","initial")
);
--> statement-breakpoint
ALTER TABLE "haohaohow"."pinyinFinalAssociation" ADD CONSTRAINT "pinyinFinalAssociation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haohaohow"."pinyinInitialAssociation" ADD CONSTRAINT "pinyinInitialAssociation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "haohaohow"."user"("id") ON DELETE no action ON UPDATE no action;