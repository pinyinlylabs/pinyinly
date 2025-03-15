-- add "prevReviewAt" to the SRS JSON
UPDATE haohaohow."skillState"
SET srs = jsonb_set(srs::jsonb, '{p}', to_jsonb(to_char(timezone('UTC', "createdAt"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
WHERE srs IS NOT NULL;

--> statement-breakpoint

-- add "nextReviewAt" to the SRS JSON
UPDATE haohaohow."skillState"
SET srs = jsonb_set(srs::jsonb, '{n}', to_jsonb(to_char(timezone('UTC', "dueAt"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
WHERE srs IS NOT NULL;

--> statement-breakpoint

-- rename "type" to "t"
UPDATE haohaohow."skillState"
SET srs = jsonb_set(srs::jsonb - 'type', '{t}', srs::jsonb->'type')
WHERE srs IS NOT NULL;

--> statement-breakpoint

-- rename "stability" to "s"
UPDATE haohaohow."skillState"
SET srs = jsonb_set(srs::jsonb - 'stability', '{s}', srs::jsonb->'stability')
WHERE srs IS NOT NULL;

--> statement-breakpoint

-- rename "difficulty" to "d"
UPDATE haohaohow."skillState"
SET srs = jsonb_set(srs::jsonb - 'difficulty', '{d}', srs::jsonb->'difficulty')
WHERE srs IS NOT NULL;
