import { parseDecimalFileSize } from "#fileSize.ts";
import { describe, expect, test } from "vitest";

describe(
  `parseDecimalFileSize` satisfies HasNameOf<typeof parseDecimalFileSize>,
  () => {
    test(`parses decimal file sizes in bytes`, () => {
      expect(parseDecimalFileSize(`1MB`)).toBe(1_000_000);
      expect(parseDecimalFileSize(`250kB`)).toBe(250_000);
      expect(parseDecimalFileSize(`500B`)).toBe(500);
      expect(parseDecimalFileSize(`1.5MB`)).toBe(1_500_000);
    });

    test(`supports case-insensitive units and surrounding whitespace`, () => {
      expect(parseDecimalFileSize(` 2mb `)).toBe(2_000_000);
      expect(parseDecimalFileSize(`3 KB`)).toBe(3000);
      expect(parseDecimalFileSize(`4gb`)).toBe(4_000_000_000);
    });

    test(`parses binary IEC file sizes in bytes`, () => {
      expect(parseDecimalFileSize(`1MiB`)).toBe(1_048_576);
      expect(parseDecimalFileSize(`1KiB`)).toBe(1024);
      expect(parseDecimalFileSize(`1GiB`)).toBe(1_073_741_824);
      expect(parseDecimalFileSize(`1.5MiB`)).toBe(1_572_864);
    });

    test(`throws for unsupported or invalid file sizes`, () => {
      expect(() => parseDecimalFileSize(`abc`)).toThrow(
        `Invalid file size "abc". Expected formats like "250kB", "1MB", "500B", or "1MiB".`,
      );
      expect(() => parseDecimalFileSize(`-1MB`)).toThrow(
        `Invalid file size "-1MB". Expected formats like "250kB", "1MB", "500B", or "1MiB".`,
      );

      const hugeSize = `${`1${`0`.repeat(400)}`}GB`;
      expect(() => parseDecimalFileSize(hugeSize)).toThrow(
        `Invalid file size value in "${hugeSize}".`,
      );
    });
  },
);
