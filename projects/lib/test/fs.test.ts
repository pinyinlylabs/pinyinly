import { describe, expect, test, vi } from "vitest";

const { globRawMock, globSyncRawMock, readdirRawMock } = vi.hoisted(() => {
  return {
    globRawMock: vi.fn(),
    globSyncRawMock: vi.fn(),
    readdirRawMock: vi.fn(),
  };
});

vi.mock(`glob`, () => {
  return {
    glob: globRawMock,
    globSync: globSyncRawMock,
  };
});

vi.mock(`node:fs/promises`, async () => {
  const actual = await vi.importActual(`node:fs/promises`);

  return {
    ...actual,
    readdir: readdirRawMock,
  };
});

const fs = await import(`#fs.ts`);

describe(`glob wrapper` satisfies HasNameOf<typeof fs.glob>, () => {
  test(`normalizes results to NFC and defaults posix to true`, async () => {
    globRawMock.mockResolvedValue([`a/e\u0301.mp3`]);

    const result = await fs.glob(`**/*.mp3`);

    expect(globRawMock).toHaveBeenCalledWith(`**/*.mp3`, { posix: true });
    expect(result).toEqual([`a/é.mp3`]);
  });

  test(`allows explicit options to override defaults`, async () => {
    globRawMock.mockResolvedValue([`b/e\u0301.mp3`]);

    await fs.glob(`**/*.mp3`, { cwd: `/tmp`, posix: false });

    expect(globRawMock).toHaveBeenCalledWith(`**/*.mp3`, {
      cwd: `/tmp`,
      posix: false,
    });
  });
});

describe(`globSync wrapper` satisfies HasNameOf<typeof fs.globSync>, () => {
  test(`normalizes results to NFC and defaults posix to true`, () => {
    globSyncRawMock.mockReturnValue([`c/e\u0301.mp3`]);

    const result = fs.globSync(`**/*.mp3`);

    expect(globSyncRawMock).toHaveBeenCalledWith(`**/*.mp3`, {
      posix: true,
    });
    expect(result).toEqual([`c/é.mp3`]);
  });
});

describe(`readdir wrapper` satisfies HasNameOf<typeof fs.readdir>, () => {
  test(`normalizes results to NFC`, async () => {
    readdirRawMock.mockResolvedValue([`d/e\u0301.mp3`]);

    const result = await fs.readdir(`/tmp/out`);

    expect(readdirRawMock).toHaveBeenCalledWith(`/tmp/out`);
    expect(result).toEqual([`d/é.mp3`]);
  });
});
