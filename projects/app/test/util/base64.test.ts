import { parseBase64DataUri } from "#util/base64.ts";
import { describe, expect, test } from "vitest";

describe(
  `parseBase64DataUri utility` satisfies HasNameOf<typeof parseBase64DataUri>,
  () => {
    test(`parses valid PNG base64 data URI`, () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
      const dataUri = `image/png;base64,${pngBase64}`;

      const result = parseBase64DataUri(dataUri);

      expect(result.mimeType).toBe(`image/png`);
      expect(result.data).toBe(pngBase64);
    });

    test(`parses valid JPEG base64 data URI`, () => {
      const jpegBase64 = `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==`;
      const dataUri = `image/jpeg;base64,${jpegBase64}`;

      const result = parseBase64DataUri(dataUri);

      expect(result.mimeType).toBe(`image/jpeg`);
      expect(result.data).toBe(jpegBase64);
    });

    test(`parses base64 data URI with WebP MIME type`, () => {
      const webpBase64 = `UklGRmIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD0JZACdLoB/g==`;
      const dataUri = `image/webp;base64,${webpBase64}`;

      const result = parseBase64DataUri(dataUri);

      expect(result.mimeType).toBe(`image/webp`);
      expect(result.data).toBe(webpBase64);
    });

    test(`parses base64 data URI with application MIME type`, () => {
      const appBase64 = `VGVzdCBkYXRh`;
      const dataUri = `application/octet-stream;base64,${appBase64}`;

      const result = parseBase64DataUri(dataUri);

      expect(result.mimeType).toBe(`application/octet-stream`);
      expect(result.data).toBe(appBase64);
    });

    test(`throws error for malformed data URI without base64 keyword`, () => {
      const invalidUri = `image/png;data,abc123`;

      expect(() => parseBase64DataUri(invalidUri)).toThrow(
        `Invalid base64 data URI format`,
      );
    });

    test(`throws error for malformed data URI without MIME type`, () => {
      const base64Data = `abc123`;
      const invalidUri = `base64,${base64Data}`;

      expect(() => parseBase64DataUri(invalidUri)).toThrow(
        `Invalid base64 data URI format`,
      );
    });

    test(`throws error for empty data URI`, () => {
      expect(() => parseBase64DataUri(``)).toThrow(
        `Invalid base64 data URI format`,
      );
    });

    test(`throws error for URI without data portion`, () => {
      expect(() => parseBase64DataUri(`image/png;base64,`)).toThrow(
        `Invalid base64 data URI format`,
      );
    });

    test(`throws error with custom label in message`, () => {
      const invalidUri = `invalid-format`;

      expect(() => parseBase64DataUri(invalidUri, `my-image`)).toThrow(
        `Invalid reference image data format for label "my-image"`,
      );
    });

    test(`throws error with custom label when data portion is missing`, () => {
      expect(() =>
        parseBase64DataUri(`image/png;base64,`, `style-reference`),
      ).toThrow(
        `Invalid reference image data format for label "style-reference"`,
      );
    });

    test(`handles base64 data with padding characters`, () => {
      const paddedBase64 = `VGVzdCBkYXRhIHdpdGggcGFkZGluZw==`;
      const dataUri = `image/png;base64,${paddedBase64}`;

      const result = parseBase64DataUri(dataUri);

      expect(result.data).toBe(paddedBase64);
    });

    test(`preserves exact base64 data without modification`, () => {
      const exactBase64 = `iVB///ORw0KGgoAAAANSUhEUgAAAAEAAAAB_CA///YfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
      const dataUri = `image/png;base64,${exactBase64}`;

      const result = parseBase64DataUri(dataUri);

      expect(result.data).toBe(exactBase64);
    });
  },
);
