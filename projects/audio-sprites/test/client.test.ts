import { isAudioSpriteSource, resolveAudioSource } from "#client.ts";
import type { AudioSpriteSource } from "#types.ts";
import { describe, expect, test } from "vitest";

describe(`resolveAudioSource`, () => {
  test(`returns null when source is null`, () => {
    expect(resolveAudioSource(null)).toBeNull();
  });

  test(`resolves a string AudioSource to { uri }`, () => {
    const source = `https://example.com/audio.m4a`;
    const result = resolveAudioSource(source);

    expect(result).toEqual({
      uri: `https://example.com/audio.m4a`,
    });
  });

  test(`resolves an AudioSpriteSource with string asset to { uri, range }`, () => {
    const source: AudioSpriteSource = {
      asset: `https://example.com/sprite.m4a`,
      start: 1.5,
      duration: 2.3,
    };
    const result = resolveAudioSource(source);

    expect(result).toEqual({
      uri: `https://example.com/sprite.m4a`,
      range: [1.5, 2.3],
    });
  });

  test(`resolves an AudioSpriteSource with object asset to { uri, range }`, () => {
    const source: AudioSpriteSource = {
      asset: { uri: `https://example.com/sprite.m4a` },
      start: 0.5,
      duration: 1.0,
    };
    const result = resolveAudioSource(source);

    expect(result).toEqual({
      uri: `https://example.com/sprite.m4a`,
      range: [0.5, 1.0],
    });
  });

  test(`throws when AudioSpriteSource has invalid asset`, () => {
    const source = {
      asset: {},
      start: 0.5,
      duration: 1.0,
    } as AudioSpriteSource;

    expect(() => resolveAudioSource(source)).toThrow(
      `Could not determine URI for audio source`,
    );
  });

  test(`throws when source is neither string nor AudioSpriteSource`, () => {
    const source = 123 as unknown as string;

    expect(() => resolveAudioSource(source)).toThrow(
      `Expected audio source to be a string, but found`,
    );
  });
});

describe(`isAudioSpriteSource`, () => {
  test(`returns true for valid AudioSpriteSource with string asset`, () => {
    const source: AudioSpriteSource = {
      asset: `https://example.com/sprite.m4a`,
      start: 1.5,
      duration: 2.3,
    };

    expect(isAudioSpriteSource(source)).toBe(true);
  });

  test(`returns true for valid AudioSpriteSource with object asset`, () => {
    const source: AudioSpriteSource = {
      asset: { uri: `https://example.com/sprite.m4a` },
      start: 0.5,
      duration: 1.0,
    };

    expect(isAudioSpriteSource(source)).toBe(true);
  });

  test(`returns false for string AudioSource`, () => {
    const source = `https://example.com/audio.m4a`;

    expect(isAudioSpriteSource(source)).toBe(false);
  });

  test(`returns false for null`, () => {
    expect(isAudioSpriteSource(null)).toBe(false);
  });

  test(`returns false for object without required properties`, () => {
    const source = { asset: `test.m4a` } as unknown as AudioSpriteSource;

    expect(isAudioSpriteSource(source)).toBe(false);
  });
});
