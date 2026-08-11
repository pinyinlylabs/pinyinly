import type { LocationSetKey, LocationSpec } from "@/data/model";
import { getLocationSetName } from "@/data/userSettings";
import { invariant } from "@pinyinly/lib/invariant";
import omit from "lodash/omit";

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  const rendered = template
    .trim()
    .replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu, (match, key: string) => {
      return variables[key] ?? match;
    });

  const unresolvedVariables = Array.from(
    rendered.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu),
    (match) => match[1],
  );

  if (unresolvedVariables.length > 0) {
    throw new Error(
      `Unresolved prompt template variables: ${unresolvedVariables.join(`, `)}`,
    );
  }

  return rendered;
}

/**
 * Create standardised `location` and `locationSet` objects suitable for
 * injecting into prompts that need context on a single location set.
 */
export function locationAndLocationSetFromInput(input: {
  locationSpec: LocationSpec;
  locationSetKey: LocationSetKey;
}): { location: object; locationSet: object } {
  const locationSetSpec = input.locationSpec.sets?.[input.locationSetKey];
  invariant(
    locationSetSpec != null,
    `Location set "%s" not found in location spec.`,
    input.locationSetKey,
  );

  return {
    location: {
      name: input.locationSpec.location,
      ...omit(input.locationSpec, [`sets`, `location`]),
    },
    locationSet: {
      name: getLocationSetName(input.locationSetKey),
      ...locationSetSpec,
    },
  };
}
