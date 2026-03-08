import { sniffImageMimeTypeFromBuffer } from "#server/lib/image.ts";
import { describe, expect, test } from "vitest";

describe(
  `sniffImageMimeTypeFromBuffer suite` satisfies HasNameOf<
    typeof sniffImageMimeTypeFromBuffer
  >,
  () => {
    test(`returns image/png for PNG header`, () => {
      const buffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(`image/png`);
    });

    test(`returns image/jpeg for JPEG header`, () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xee, 0x00]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(`image/jpeg`);
    });

    test(`returns image/gif for GIF89a header`, () => {
      const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(`image/gif`);
    });

    test(`returns image/gif for GIF87a header`, () => {
      const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(`image/gif`);
    });

    test(`returns image/webp for RIFF/WEBP header`, () => {
      const buffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
        0x56,
      ]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(`image/webp`);
    });

    test(`returns null for unsupported header`, () => {
      const buffer = Buffer.from([0x00, 0x11, 0x22, 0x33]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(null);
    });

    test(`returns null for empty buffer`, () => {
      const buffer = Buffer.from([]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(null);
    });

    test(`returns null for buffer too short for any format`, () => {
      const buffer = Buffer.from([0xff]);

      expect(sniffImageMimeTypeFromBuffer(buffer)).toBe(null);
    });
  },
);
