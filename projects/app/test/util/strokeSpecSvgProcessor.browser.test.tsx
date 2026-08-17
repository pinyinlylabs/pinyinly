import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import type { Locator } from "vitest/browser";
import { page, locators } from "vitest/browser";
import { View } from "react-native";
import { HanziGraphic } from "#client/ui/HanziGraphic.tsx";
import "#global.css";
import { buildStrokeSpecSegmentPaths } from "#util/strokeSpecSvgProcessor.js";
import { strokeSpecFilter } from "#util/strokeSpec.js";
import {
  parseSvgPaths,
  transformFigmaSvgPathsToArphicTtfSpace,
} from "#util/svgFont.js";
import type { StrokeSpecString } from "#data/model.js";

locators.extend({
  getByTagName(tagName: string) {
    return tagName;
  },
});

// if you are using typescript, you can extend LocatorSelectors interface
// to have the autocompletion in locators.extend, page.* and locator.* methods
declare module "vitest/browser" {
  interface LocatorSelectors {
    getByTagName(tagName: string): Locator;
  }
}

// 电 diàn
const dian4Svg = {
  medians: [
    `M 209 564 L 250 530 L 264 503 L 301 265 L 324 195`,
    `M 280 549 L 305 538 L 625 599 L 666 600 L 703 588 L 732 556 L 710 476 L 688 359 L 655 254 L 660 224`,
    `M 345 396 L 404 401 L 531 428 L 571 429 L 594 422`,
    `M 343 227 L 355 240 L 373 244 L 596 273 L 614 282`,
    `M 416 788 L 449 765 L 476 728 L 463 224 L 476 126 L 489 89 L 507 62 L 540 37 L 620 19 L 743 19 L 837 40 L 886 68 L 901 235`,
  ],
  strokes: [
    `M 272 553 Q 244 569 214 577 Q 207 578 201 573 Q 192 566 203 554 Q 255 473 269 285 Q 270 222 312 187 Q 315 186 319 183 Q 338 177 339 213 Q 339 217 339 221 L 335 256 Q 308 376 296 514 C 294 541 294 541 272 553 Z`,
    `M 614 250 Q 633 220 652 212 Q 665 202 683 228 Q 705 267 745 475 Q 755 512 783 542 Q 799 557 785 574 Q 766 593 716 625 Q 695 634 610 614 Q 603 614 498 594 L 445 585 Q 424 582 405 578 Q 332 563 272 553 C 242 548 267 505 296 514 Q 295 515 298 515 Q 356 533 445 548 L 496 557 Q 548 567 612 576 Q 657 583 671 567 Q 690 545 686 521 Q 647 301 624 286 C 609 260 608 259 614 250 Z`,
    `M 491 397 Q 543 406 589 411 Q 614 414 605 428 Q 595 444 568 449 Q 526 456 492 440 L 443 428 Q 389 418 344 406 Q 326 402 347 386 Q 359 377 442 390 L 491 397 Z`,
    `M 490 240 Q 544 247 614 250 C 644 251 646 266 624 286 Q 621 290 616 293 Q 600 302 490 280 L 437 270 Q 383 263 335 256 C 305 252 309 221 339 221 Q 346 220 358 222 Q 389 229 437 234 L 490 240 Z`,
    `M 942 61 Q 921 119 913 220 Q 912 236 905 244 Q 898 251 892 235 Q 877 175 861 130 Q 854 99 825 81 Q 791 44 630 46 Q 569 52 545 64 Q 526 77 513 101 Q 494 141 490 240 L 490 280 Q 490 344 491 397 L 492 440 Q 493 506 496 557 L 498 594 Q 504 682 515 724 Q 522 746 492 769 Q 467 785 445 797 Q 426 810 408 798 Q 396 792 418 763 Q 443 729 444 680 Q 445 647 445 585 L 445 548 Q 444 496 443 428 L 442 390 Q 441 368 441 344 Q 438 304 437 270 L 437 234 Q 437 101 490 40 Q 544 -21 756 -10 Q 850 -6 920 27 Q 953 36 942 61 Z`,
  ],
};

// swirl
const swirlSvg = transformFigmaSvgPathsToArphicTtfSpace(
  parseSvgPaths(`<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M310.583 367.942L799.312 636.85" stroke="black" stroke-dasharray="4 4"/>
<path d="M276.436 585.63C296.924 575.386 314.851 537.255 321.254 519.47C351.133 464.692 430.202 389.543 511.197 376.479C577.357 365.808 684.066 414.894 711.81 476.786C759.797 583.834 699.005 658.192 652.053 649.655" stroke="black" stroke-dasharray="4 4"/>
<path d="M801.446 668.863L287.107 376.479L306.315 338.063L829.191 613.374L801.446 668.863Z" fill="black" fill-opacity="0.6" stroke="black"/>
<path d="M681.932 370.076C573.088 271.903 359.669 318.856 263.631 521.604C240.866 534.409 208.995 571.971 263.631 619.777C331.925 679.534 353.267 521.604 436.5 461.847C519.733 402.089 549.612 429.834 649.919 485.323C730.164 529.714 652.053 593.455 602.967 619.777C599.41 653.212 614.918 710.693 705.408 673.131C818.52 626.179 790.775 468.249 681.932 370.076Z" fill="black" fill-opacity="0.6" stroke="black"/>
</svg>
`),
);

// 囬
const hui2Svg = {
  medians: [
    `M204.77 670.755V19.469`,
    `M219.07 657.756H818.357V18.169`,
    `M406.266 655.156V77.968`,
    `M618.161 656.456V71.468`,
    `M417.966 467.96H610.362`,
    `M417.966 266.464H605.162`,
    `M224.27 72.768H804.058`,
  ],
  strokes: [
    `M177.6 683.2V10.4H234.4V683.2H177.6Z`,
    `M848 9.4V682.2L212.8 683.129V629.529L789.6 628.6V9.4H848Z`,
    `M378.4 665.6H435.2V64H378.4V665.6Z`,
    `M591.2 665.6H648V63.2H591.2V665.6Z`,
    `M407.2 496H626.4V442.4H407.2V496Z`,
    `M407.2 295.2H626.4V241.6H407.2V295.2Z`,
    `M212.8 100H820V46.4H212.8V100Z`,
  ],
};

test.for([
  {
    name: `hui2Svg (1)`,
    svg: hui2Svg,
    strokeSpec: `2,1[13%:34.6%],3,4,5+6[27%:73%]`,
  },
  { name: `dian4 (1)`, svg: dian4Svg, strokeSpec: `0-1,3` },
  { name: `dian4 (2)`, svg: dian4Svg, strokeSpec: `4[1:3]` },
  { name: `dian4 (3)`, svg: dian4Svg, strokeSpec: `4[1:2]` },
  { name: `dian4 (4)`, svg: dian4Svg, strokeSpec: `4[:3]` },
  { name: `dian4 (5)`, svg: dian4Svg, strokeSpec: `4[1:]` },
  { name: `dian4 (6)`, svg: dian4Svg, strokeSpec: `0-2,4[1:3],3` },
  { name: `swirlSvg (1)`, svg: swirlSvg, strokeSpec: `0,1` },
  { name: `swirlSvg (2)`, svg: swirlSvg, strokeSpec: `0[:1]` },
  { name: `swirlSvg (3)`, svg: swirlSvg, strokeSpec: `0[:1#1]` },
  // { name: `hui2`, svg: hui2Svg, strokeSpec: `2,1[2:3],3,4-5` },
] as const)(
  `render $name $strokeSpec`,
  async ({ name, svg, strokeSpec: strokeSpecStr }) => {
    const strokeSpec = strokeSpecStr as StrokeSpecString;

    const segmentPaths = buildStrokeSpecSegmentPaths(svg.strokes, svg.medians, [
      strokeSpec,
    ]);

    const fgSvgPaths = strokeSpecFilter(svg.strokes, segmentPaths, strokeSpec);

    await render(
      <View testID="pyly-snapshot" className="size-100">
        <HanziGraphic
          className="size-100"
          bgSvgPaths={svg.strokes}
          fgSvgPaths={fgSvgPaths}
        />
      </View>,
    );

    await expect.element(page.getByTagName(`path`).first()).toBeInTheDocument();

    await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(name);
  },
);

test(`svg export`, async () => {
  const path = `M843 79L843 7L144 7L144 79ZM884 795L884 -59L808 -59L808 721L183 721L183 -59L107 -59L107 795ZM630 554L630 482L362 482L362 554ZM630 317L630 245L362 245L362 317ZM399 758L399 42L326 42L326 758ZM669 758L669 42L597 42L597 758Z`;

  await render(
    <View testID="pyly-target" className="size-100 flex-row gap-2">
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
        bgSvgPaths={dian4Svg.strokes}
        fgSvgPaths={[]}
      />
    </View>,
  );

  await expect(page.getByTestId(`pyly-target`)).toMatchScreenshot();
});
