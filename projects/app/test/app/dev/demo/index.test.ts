import { projectRoot } from "#bin/util/paths.ts";
import { existsSync, globSync } from "@pinyinly/lib/fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const sourceRoot = path.join(projectRoot, `src`);
const requiredDemoGlobs = [`client/ui/QuizDeck*Question.tsx`] as const;

describe(`dev demo requirements`, () => {
  test.for(requiredDemoGlobs)(
    `enforce required demos exist for %s`,
    (sourceGlob) => {
      const sourceFiles = globSync(sourceGlob, { cwd: sourceRoot });
      expect(sourceFiles).not.toHaveLength(0);

      const missingDemos = sourceFiles.filter((sourcePath) => {
        const extension = path.extname(sourcePath);
        const demoPath = `${sourcePath.slice(0, -extension.length)}.demo.tsx`;
        return !existsSync(path.join(sourceRoot, demoPath));
      });
      expect(missingDemos).toEqual([]);
    },
  );
});
