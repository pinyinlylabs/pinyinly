// pyly-not-src-test

import type { Shape } from "@lottiefiles/lottie-js";
import { Animation, MatteMode, ShapeLayer } from "@lottiefiles/lottie-js";
import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { projectRoot } from "../helpers.ts";

describe(`no luminance layers in lottie animations (incompatible with lottie-ios)`, async () => {
  for await (const [lottieFile, anim] of iterLottieAssets()) {
    test(lottieFile, () => {
      // This test checks that no layer in
      // Check each layer to make sure it's not a luminance mask.
      for (const layer of anim.layers) {
        expect(layer.matteMode).not.toBe(MatteMode.LUMA);
      }
    });
  }
});

describe(`regression https://github.com/Pixofield/keyshape-lottie-format/pull/15`, async () => {
  const namedSchema = z.object({ name: z.string().optional() });

  for await (const [lottieFile, anim] of iterLottieAssets()) {
    test(lottieFile, () => {
      const validateItem = (
        value:
          | Pick<Animation, `name` | `toJSON`>
          | Pick<Shape, `name` | `toJSON`>,
      ) => {
        expect(() => namedSchema.parse(value)).not.toThrow();
      };

      validateItem(anim);
      for (const layer of anim.layers) {
        validateItem(layer);
        if (layer instanceof ShapeLayer) {
          for (const shape of layer.shapes) {
            validateItem(shape);
          }
        }
      }
    });
  }
});

async function* iterLottieAssets(): AsyncGenerator<
  [path: string, animation: Animation],
  void,
  void
> {
  const assetsPath = path.join(projectRoot, `src/assets`);
  let foundFiles = false;

  for (const lottieFile of await fs.glob(`**/*.lottie.json`, {
    cwd: assetsPath,
  })) {
    foundFiles = true;
    const lottieContents = await fs.readFile(
      path.join(assetsPath, lottieFile),
      `utf8`,
    );

    const lottieJs = new Animation();
    const anim = lottieJs.fromJSON(
      z.record(z.string(), z.unknown()).parse(JSON.parse(lottieContents)),
    );

    yield [lottieFile, anim];
  }

  expect(foundFiles).toBe(true); // no lottie files found, wrong path set?
}
