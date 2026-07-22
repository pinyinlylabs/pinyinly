export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template
    .trim()
    .replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu, (_, key: string) => {
      return variables[key] ?? ``;
    });
}
