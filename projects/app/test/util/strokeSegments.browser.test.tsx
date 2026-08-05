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

test(`svg export`, async () => {
  const path = `M843 79L843 7L144 7L144 79ZM884 795L884 -59L808 -59L808 721L183 721L183 -59L107 -59L107 795ZM630 554L630 482L362 482L362 554ZM630 317L630 245L362 245L362 317ZM399 758L399 42L326 42L326 758ZM669 758L669 42L597 42L597 758Z`;

  await render(
    <View testID="pyly-target" className="gap-2 size-100 flex-row">
      <HanziGraphic
        className="size-100 bg-black/10"
        bgSvgPaths={[path]}
        fgSvgPaths={[]}
      />
      <HanziGraphic
        className="size-100 bg-black/10"
        bgSvgPaths={[
          `M789 491L789 420L162 420L162 491ZM511 110Q511 64 528.5 48.5Q546 33 590 33L759 33Q800 33 821.5 38.5Q843 44 853.5 60.5Q864 77 866 111Q868 142 869.5 176Q871 210 871 232L947 212Q947 203 946 189.5Q945 176 944 159Q942 111 939 78Q935 31 919 5.5Q903 -20 871.5 -30Q840 -40 785 -40L575 -40Q520 -40 490 -28Q460 -16 447 13Q434 42 434 96L434 837L511 837ZM829 715L829 193L163 193L163 263L752 263L752 644L203 644L203 193L125 193L125 715Z`,
        ]}
        fgSvgPaths={[]}
      />
      <HanziGraphic
        className="size-100 bg-purple/10"
        bgSvgPaths={[
          `M212.8 100H820V46.4H212.8V100Z`,
          `M407.2 295.2H626.4V241.6H407.2V295.2Z`,
          `M407.2 496H626.4V442.4H407.2V496Z`,
          `M591.2 665.6H648V63.2H591.2V665.6Z`,
          `M378.4 665.6H435.2V64H378.4V665.6Z`,
          `M848 10.4V683.2H212.8V629.6H789.6V10.4H848Z`,
          `M177.6 683.2V10.4H234.4V683.2H177.6Z`,
        ]}
        fgSvgPaths={[]}
      />
      <HanziGraphic
        className="size-100 bg-black/10"
        bgSvgPaths={dianData.svg.strokes}
        fgSvgPaths={[]}
      />
    </View>,
  );

  await expect(page.getByTestId(`pyly-target`)).toMatchScreenshot();
});
