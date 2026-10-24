---
name: sentry-handwriting-fixtures
description:
  "Use when importing Sentry user-reported handwriting grades into the app's grader test fixtures,
  including false-positive/false-negative reports and positive/negative handwriting examples."
---

# Import Sentry Handwriting Fixtures

Use this workflow to turn user-reported handwriting-grade events into reviewed app test examples.
This is a one-time, user-directed import: do not add a permanent downloader or change the grading
algorithm unless separately requested.

## Workflow

1. **Confirm the target.** Ask for the Sentry organization/project and issue or search scope if
   unclear. Search all accessible events matching the request, not just the latest event. The app
   currently reports events with the tag `report-kind:handwriting-grade` and the extra field
   `handwriting-grade-report-json`. Newer reports also have the `handwriting-grade-error-type` tag:
   `false-positive` means the grader accepted the drawing, and `false-negative` means it rejected
   the drawing. This records the app's decision at report time; it does not independently verify the
   user's answer.
2. **Discover and use Sentry MCP tools.** Search the available Sentry tools for issue/event search
   and event-detail retrieval before calling deferred tools. Find matching issues (for example, with
   `report-kind:handwriting-grade`), then enumerate their events and retrieve each event's
   additional data. Check result limits, pagination, and the relevant time range; continue until all
   accessible matching results are accounted for. Do not treat an issue's occurrence count or a
   single event as the complete dataset.
3. **Extract only the report payload.** Read `handwriting-grade-report-json`. Keep event IDs, user
   identity/location, browser/device details, traces, and other unrelated Sentry metadata out of
   committed fixtures. Use session-local scratch data for extraction or visualization and remove
   temporary scripts/files when finished.
4. **Validate and deduplicate.** Use the existing parser and stroke codec in
   `projects/app/src/util/shapeContextGraderExample.ts` (for example,
   `parseShapeContextGraderExampleJson` and `decodeShapeContextStrokes`). Check that the payload is
   well-formed and the character is a single Hanzi. Compare exact stroke data against both the other
   reports and existing fixtures in `projects/app/test/util/shapeContextGrader.test.ts`. Drop exact
   duplicates; retain distinct drawings of the same character. Account for every event as imported,
   duplicate, invalid, inaccessible, or awaiting a decision, and report any limits or failures.
5. **Review expected outcomes.** Older reports may have no outcome tag, and the report JSON itself
   may contain only strokes and grader options. A newer `handwriting-grade-error-type` tag
   identifies whether the app accepted or rejected the drawing when reported; it is useful context,
   not proof that the user is objectively right. Review the drawing against its intended character
   and ask the user to classify unclear examples. Never assume that every report is a false negative
   or a positive example. Do not use the current grader's result as ground truth.
6. **Add minimal fixtures.** Follow the existing positive/negative array conventions in
   `projects/app/test/util/shapeContextGrader.test.ts`. Store each example with `id` and
   `drawnStrokes`; do not add Sentry provenance, captured `options`, or `knownFailure` fields to
   fixture objects. Options are grader reproduction metadata, not an expected outcome. If a reviewed
   example is not yet handled by the grader, mark it with the existing `skip: true` fixture field
   and filter skipped examples out of grading tests, as done for existing skipped examples. Do not
   maintain a duplicate failure-ID set. Preserve the existing array names
   `positiveHandwritingExamples` and `negativeHandwritingExamples`.
7. **Test the expectation.** Ensure positive examples have explicit acceptance assertions and
   negative examples explicit rejection assertions for non-skipped fixtures. Do not relabel examples
   to match current behavior, weaken assertions, or tune the algorithm as part of a fixture-only
   import. Keep unrelated existing tests intact.
8. **Verify.** Format app files with `moon run app:fmt`, run the focused test with
   `moon run app:test -- test/util/shapeContextGrader.test.ts`, and run the required repository
   check `moon run ':#ci'`. Inspect the diff to ensure it contains only intended fixture/test
   changes.
9. **Summarize.** State counts for fetched, imported positive/negative, duplicate, invalid, and
   inaccessible events; note ambiguous classifications, current expected failures, and Sentry
   search/retention limits. Do not claim full coverage beyond the events actually enumerated.
