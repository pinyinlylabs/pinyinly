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
