import { memoize0 } from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import path from "node:path";
import { z } from "zod/v4";

export const hsk2026FilePath = path.join(import.meta.dirname, `hsk2026.json`);

export const hsk2026Schema = z.object({
  level1: z.array(z.string()),
  level2: z.array(z.string()),
  level3: z.array(z.string()),
  level4: z.array(z.string()),
  level5: z.array(z.string()),
  level6: z.array(z.string()),
  level7: z.array(z.string()),
});

export type Hsk2026Type = z.infer<typeof hsk2026Schema>;

export const loadHsk2026 = memoize0(async (): Promise<Hsk2026Type> => {
  const dataText = await readFile(hsk2026FilePath, `utf8`);
  return hsk2026Schema.parse(JSON.parse(dataText));
});
