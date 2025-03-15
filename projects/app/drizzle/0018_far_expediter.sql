ALTER TABLE "haohaohow"."skillState" RENAME COLUMN "skillId" TO "skill";--> statement-breakpoint
ALTER TABLE "haohaohow"."skillState" DROP CONSTRAINT "skillState_userId_skillId_unique";--> statement-breakpoint
ALTER TABLE "haohaohow"."skillState" DROP COLUMN "dueAt";--> statement-breakpoint
ALTER TABLE "haohaohow"."skillState" ADD CONSTRAINT "skillState_userId_skill_unique" UNIQUE("userId","skill");