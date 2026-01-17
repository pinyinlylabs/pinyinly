-- Add reviewId and trashedAt columns for undo functionality.
-- reviewId links together ratings and mistakes from a single quiz answer.

-- Create a function to generate nanoid-compatible IDs (12 chars, alphanumeric)
CREATE OR REPLACE FUNCTION haohaohow.generate_nanoid() RETURNS text AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  id text := '';
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    id := id || substr(alphabet, floor(random() * 62)::int + 1, 1);
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Step 1: Add columns as nullable
ALTER TABLE "haohaohow"."skillRating" ADD COLUMN "reviewId" text;--> statement-breakpoint
ALTER TABLE "haohaohow"."skillRating" ADD COLUMN "trashedAt" timestamp;--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziGlossMistake" ADD COLUMN "reviewId" text;--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziGlossMistake" ADD COLUMN "trashedAt" timestamp;--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziPinyinMistake" ADD COLUMN "reviewId" text;--> statement-breakpoint
ALTER TABLE "haohaohow"."hanziPinyinMistake" ADD COLUMN "trashedAt" timestamp;--> statement-breakpoint

-- Step 2: Backfill reviewId for existing rows.
-- Records with matching (userId, timestamp) share a reviewId since they came from the same quiz answer.

-- Create a temp table mapping (userId, timestamp) -> reviewId across all three tables
CREATE TEMP TABLE review_id_mapping AS
WITH all_reviews AS (
  SELECT "userId", "timestamp" FROM "haohaohow"."skillRating"
  UNION
  SELECT "userId", "timestamp" FROM "haohaohow"."hanziGlossMistake"
  UNION
  SELECT "userId", "timestamp" FROM "haohaohow"."hanziPinyinMistake"
)
SELECT "userId", "timestamp", haohaohow.generate_nanoid() as review_id
FROM all_reviews;--> statement-breakpoint

-- Update skillRating with generated reviewIds
UPDATE "haohaohow"."skillRating" sr
SET "reviewId" = rim.review_id
FROM review_id_mapping rim
WHERE sr."userId" = rim."userId" AND sr."timestamp" = rim."timestamp";--> statement-breakpoint

-- Update hanziGlossMistake with generated reviewIds
UPDATE "haohaohow"."hanziGlossMistake" hgm
SET "reviewId" = rim.review_id
FROM review_id_mapping rim
WHERE hgm."userId" = rim."userId" AND hgm."timestamp" = rim."timestamp";--> statement-breakpoint

-- Update hanziPinyinMistake with generated reviewIds
UPDATE "haohaohow"."hanziPinyinMistake" hpm
SET "reviewId" = rim.review_id
FROM review_id_mapping rim
WHERE hpm."userId" = rim."userId" AND hpm."timestamp" = rim."timestamp";--> statement-breakpoint

-- Clean up temp table
DROP TABLE review_id_mapping;--> statement-breakpoint

-- Clean up the helper function
DROP FUNCTION haohaohow.generate_nanoid();--> statement-breakpoint

-- reviewId is left nullable for backwards compatibility with v8 clients

-- Create indexes on reviewId for efficient undo lookups
CREATE INDEX "skillRating_reviewId_index" ON "haohaohow"."skillRating" USING btree ("reviewId");--> statement-breakpoint
CREATE INDEX "hanziGlossMistake_reviewId_index" ON "haohaohow"."hanziGlossMistake" USING btree ("reviewId");--> statement-breakpoint
CREATE INDEX "hanziPinyinMistake_reviewId_index" ON "haohaohow"."hanziPinyinMistake" USING btree ("reviewId");
