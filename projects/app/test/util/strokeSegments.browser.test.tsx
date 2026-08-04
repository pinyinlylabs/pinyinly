import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { View } from "react-native";
import dianData from "#/client/wiki/电/character.json";
import { HanziGraphic } from "#client/ui/HanziGraphic.tsx";
import "#global.css";
import { buildSvgSegmentPaths } from "#util/strokeSegments.js";
import { strokeSpecFilter } from "#util/strokeSpec.js";

test.for([
  { name: `dian4`, svg: dianData.svg, strokeSpec: `0-1,3` },
  { name: `dian4`, svg: dianData.svg, strokeSpec: `4[1:3]` },
  { name: `dian4`, svg: dianData.svg, strokeSpec: `4[1:2]` },
  { name: `dian4`, svg: dianData.svg, strokeSpec: `4[:3]` },
  { name: `dian4`, svg: dianData.svg, strokeSpec: `4[1:]` },
  { name: `dian4`, svg: dianData.svg, strokeSpec: `0-2,4[1:3],3` },
] as const)(`render $name $strokeSpec`, async ({ name, svg, strokeSpec }) => {
  const segmentPaths = buildSvgSegmentPaths(svg.strokes, svg.medians, [
    strokeSpec,
  ]);

  const fgSvgPaths = strokeSpecFilter(svg.strokes, segmentPaths, strokeSpec);

  await render(
    <View testID="pyly-target" className="size-100">
      <HanziGraphic
        className="size-100"
        bgSvgPaths={svg.strokes}
        fgSvgPaths={fgSvgPaths}
      />
    </View>,
  );

  await expect(page.getByTestId(`pyly-target`)).toMatchScreenshot(
    `${name}-${strokeSpec}`,
  );
});
