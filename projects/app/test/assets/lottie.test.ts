// hhh-standalone-test

import type { Shape } from "@lottiefiles/lottie-js";
import { Animation, MatteMode, ShapeLayer } from "@lottiefiles/lottie-js";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { z } from "zod/v4";

await test(`no luminance layers in lottie animations (incompatible with lottie-ios)`, async () => {
  for await (const [lottieFile, anim] of iterLottieAssets()) {
    // Check each layer to make sure it's not a luminance mask.
    for (const layer of anim.layers) {
      assert.notEqual(
        layer.matteMode,
        MatteMode.LUMA,
        `luminance layer in ${lottieFile} (id=${layer.id})`,
      );
    }
  }
});

await test(`regression https://github.com/Pixofield/keyshape-lottie-format/pull/15`, async () => {
  const namedSchema = z.object({ name: z.string().optional() });

  for await (const [lottieFile, anim] of iterLottieAssets()) {
    const assertValid = (
      value:
        | Pick<Animation, `name` | `toJSON`>
        | Pick<Shape, `name` | `toJSON`>,
    ) => {
      assert.doesNotThrow(
        () => namedSchema.parse(value),
        `Invalid name (.nm) in ${lottieFile} (${JSON.stringify(value.toJSON())})`,
      );
    };

    assertValid(anim);
    for (const layer of anim.layers) {
      assertValid(layer);
      if (layer instanceof ShapeLayer) {
        for (const shape of layer.shapes) {
          assertValid(shape);
        }
      }
    }
  }
});

async function* iterLottieAssets(): AsyncGenerator<
  [path: string, animation: Animation],
  void,
  void
> {
  const projectRoot = path.join(import.meta.dirname, `../..`);
  const assetsPath = path.join(projectRoot, `src/assets`);
  let foundFiles = false;

  for await (const lottieFile of fs.glob(`**/*.lottie.json`, {
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
