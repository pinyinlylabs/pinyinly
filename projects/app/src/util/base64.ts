/**
 * Parse a base64 data URI and extract MIME type and base64 data.
 * Expected format: "mimeType;base64,data"
 *
 * @param dataUri - The data URI string to parse
 * @param label - Optional label for error messages (e.g., for context in errors)
 * @returns Object with mimeType and base64 data
 * @throws Error if the data URI format is invalid
 */
export function parseBase64DataUri(
  dataUri: string,
  label?: string,
): { mimeType: string; data: string } {
  const formatMatch = dataUri.match(/^([^;]+);base64,(.+)$/);
  if (formatMatch && formatMatch[1] != null && formatMatch[2] != null) {
    return {
      mimeType: formatMatch[1],
      data: formatMatch[2],
    };
  }

  const errorMsg =
    label == null
      ? `Invalid base64 data URI format`
      : `Invalid reference image data format for label "${label}"`;
  throw new Error(errorMsg);
}
