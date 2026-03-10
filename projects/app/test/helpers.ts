import { projectRoot } from "#bin/util/paths.ts";
import { Rating } from "#util/fsrs.js";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type * as fontkit from "fontkit";
import path from "node:path";
import { vi } from "vitest";

interface TestFont {
  name: string;
  subset: fontkit.Font | null;
  source: fontkit.Font;
  sourcePath: string;
  subsetPath: string;
}

export async function getFonts(): Promise<TestFont[]> {
  const fontkit = await import(`fontkit`);

  async function openTtf(ttfPath: string): Promise<fontkit.Font | null> {
    let font;
    try {
      font = await fontkit.open(ttfPath);
    } catch (error) {
      console.warn(`couldn't open font at ${ttfPath}: ${error}`);
      return null;
    }
    invariant(font.type === `TTF`, `expected ${ttfPath} to be a TTF font`);
    return font;
  }

  async function getTestFont(relativeBasePath: string): Promise<TestFont> {
    const basePath = path.join(
      projectRoot,
      `src/assets/fonts`,
      relativeBasePath,
    );
    const sourcePath = `${basePath}.ttf`;
    const subsetPath = `${basePath}.subset.ttf`;

    return {
      name: path.basename(relativeBasePath),
      subset: await openTtf(subsetPath),
      subsetPath,
      source: nonNullable(await openTtf(sourcePath)),
      sourcePath,
    };
  }

  return [
    await getTestFont(`MiSans/MiSansVF`),
    await getTestFont(`MiSans/MiSansL3`),
    await getTestFont(`NotoSansSC-VariableFont_wght`),
    await getTestFont(`PinyinlyComponentsVF`),
  ];
}

export function ratingToEmoji(rating: Rating): string {
  switch (rating) {
    case Rating.Easy: {
      return `🟢`;
    }
    case Rating.Good: {
      return `🟡`;
    }
    case Rating.Hard: {
      return `🟠`;
    }
    case Rating.Again: {
      return `❌`;
    }
  }
}

export function emojiToRating(emoji: string): Rating {
  switch (emoji) {
    case `🟢`: {
      return Rating.Easy;
    }
    case `🟡`: {
      return Rating.Good;
    }
    case `🟠`: {
      return Rating.Hard;
    }
    case `❌`: {
      return Rating.Again;
    }
    default: {
      throw new Error(`Invalid emoji rating: ${emoji}`);
    }
  }
}

export function formatTimeOffset(timestamp: Date): string {
  invariant(
    vi.isFakeTimers(),
    `formatTimeOffset requires fake timers` satisfies HasNameOf<
      typeof formatTimeOffset
    >,
  );

  const earliestTime = new Date(0);

  const diffMs = timestamp.getTime() - earliestTime.getTime();
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, `0`)}:${minutes.toString().padStart(2, `0`)}:${seconds.toString().padStart(2, `0`)}`;
}
