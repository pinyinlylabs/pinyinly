/**
 * Parse a comma-separated list of stroke indices (0-based), allowing shorthand
 * ranges (e.g. 0-2,5 is the same as 0,1,2,5).
 */
export function parseIndexRanges(ranges: string): number[] {
  const result: number[] = [];
  for (const part of ranges.split(`,`)) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
    } else {
      result.push(Number(part));
    }
  }
  return result;
}

/**
 * Normalize a comma-separated list of stroke indices (0-based), e.g. "0-0" =>
 * "0", "0,1,2-4" => "0-4".
 */
export function normalizeIndexRanges(ranges: string): string {
  // Handle empty string
  if (!ranges.trim()) {
    return ``;
  }

  // Parse the ranges into individual indices
  const indices = parseIndexRanges(ranges);

  if (indices.length === 0) {
    return ``;
  }

  // Remove duplicates and sort
  const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);

  // Group consecutive numbers into ranges
  const parts: string[] = [];

  // We already checked indices.length > 0, so first element is guaranteed to exist
  const firstIndex = uniqueIndices[0];
  if (firstIndex === undefined) {
    return ``;
  }

  let rangeStart = firstIndex;
  let rangeEnd = firstIndex;

  for (let i = 1; i <= uniqueIndices.length; i++) {
    const currentIndex = uniqueIndices[i];

    if (i === uniqueIndices.length || currentIndex !== rangeEnd + 1) {
      // End of sequence or end of array
      if (rangeStart === rangeEnd) {
        parts.push(rangeStart.toString());
      } else {
        parts.push(`${rangeStart}-${rangeEnd}`);
      }

      if (i < uniqueIndices.length && currentIndex !== undefined) {
        rangeStart = currentIndex;
        rangeEnd = currentIndex;
      }
    } else {
      // Continue the sequence
      rangeEnd = currentIndex;
    }
  }

  return parts.join(`,`);
}
