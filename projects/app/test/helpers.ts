import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type * as fontkit from "fontkit";
import path from "node:path";

export const projectRoot = path.resolve(import.meta.dirname, `..`);
export const workspaceRoot = path.resolve(projectRoot, `../..`);

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
    await getTestFont(`MiSans/MiSans L3`),
    await getTestFont(`NotoSansSC/NotoSansSC-VariableFont_wght`),
    await getTestFont(`PinyinlyComponents/PinyinlyComponentsVF`),
  ];
}
