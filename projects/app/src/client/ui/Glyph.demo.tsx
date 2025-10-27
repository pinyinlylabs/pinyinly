import { cssInterop } from "nativewind";
import React from "react";
import { Platform, Text, View } from "react-native";
import { G, Path, Svg } from "react-native-svg";
import { ExampleStack } from "./demo/helpers";
import { HanziWordRefText } from "./HanziWordRefText";

export default () => {
  return (
    <>
      <View className="w-full flex-row gap-2">
        <ExampleStack title="Fingers">
          <XueGrapheme highlight={[0, 1, 2]} />
        </ExampleStack>
        <ExampleStack title="Roof">
          <XueGrapheme highlight={[3, 4]} />
        </ExampleStack>
        <ExampleStack title="Child">
          <XueGrapheme highlight={[5, 6, 7, 8]} />
        </ExampleStack>
      </View>
      <View className="w-full gap-2">
        <View className="flex-row gap-2">
          <XueGrapheme highlight={[0, 1, 2]} />
          <View>
            <Text className="pyly-body">
              the child’s <HanziWordRefText hanziWord="𭕄:radical" showGloss />
              {` `}
              poking up through the blanket
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <XueGrapheme highlight={[3, 4]} />
          <View>
            <Text className="pyly-body">
              a <HanziWordRefText hanziWord="冖:cover" showGloss /> depicting a
              blanket
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <XueGrapheme highlight={[5, 6, 7, 8]} />
          <View>
            <Text className="pyly-body">
              the <HanziWordRefText hanziWord="子:child" showGloss /> laying
              under a blanket
            </Text>
          </View>
        </View>
      </View>
    </>
  );
};

const XueGrapheme = ({ highlight }: { highlight: number[] }) => {
  const strokes = [
    `M 311 681 Q 332 656 354 626 Q 364 611 380 610 Q 390 609 397 621 Q 404 634 399 664 Q 395 694 313 727 Q 298 733 292 731 Q 288 728 287 715 Q 288 705 311 681 Z`,
    `M 456 744 Q 475 717 495 685 Q 504 672 517 669 Q 526 668 533 677 Q 540 689 539 715 Q 536 745 462 785 Q 450 792 444 791 Q 440 788 438 777 Q 439 767 456 744 Z`,
    `M 669 770 Q 642 724 586 650 Q 580 643 587 635 Q 594 634 603 639 Q 700 721 749 752 Q 768 759 763 770 Q 756 786 734 806 Q 712 824 688 825 Q 672 824 674 802 Q 678 787 669 770 Z`,
    `M 241 550 Q 231 569 222 576 Q 203 589 201 564 Q 207 527 148 466 Q 129 445 155 387 Q 170 360 190 388 Q 217 454 246 522 C 251 533 251 533 241 550 Z`,
    `M 246 522 Q 276 504 310 515 Q 472 560 708 577 Q 745 580 761 577 Q 776 570 775 563 Q 775 562 727 483 Q 720 470 725 464 Q 732 460 750 470 Q 813 507 862 516 Q 904 526 903 536 Q 902 546 832 605 Q 808 626 745 613 Q 598 600 365 564 Q 307 555 248 551 Q 244 551 241 550 C 211 547 218 534 246 522 Z`,
    `M 516 320 Q 519 321 599 382 Q 636 410 663 419 Q 682 425 676 441 Q 673 457 610 492 Q 592 502 570 494 Q 510 472 420 447 Q 396 440 339 442 Q 317 443 324 423 Q 331 411 350 400 Q 378 384 411 402 Q 433 411 546 449 Q 559 455 570 448 Q 582 441 576 427 Q 546 382 508 326 C 493 304 493 304 516 320 Z`,
    `M 538 295 Q 529 310 516 320 L 508 326 Q 502 330 498 332 Q 488 339 483 331 Q 479 327 486 314 Q 490 304 495 290 L 506 247 Q 518 163 508 105 Q 502 68 492 60 Q 489 57 408 73 Q 398 76 392 72 Q 388 71 402 59 Q 454 11 482 -28 Q 498 -46 516 -37 Q 538 -25 555 27 Q 579 117 557 250 L 538 295 Z`,
    `M 557 250 Q 701 269 878 253 Q 902 250 908 259 Q 915 272 903 284 Q 875 312 831 332 Q 816 338 790 330 Q 742 321 538 295 L 495 290 Q 384 281 328 274 Q 264 264 170 264 Q 157 264 155 253 Q 154 240 173 226 Q 189 213 220 201 Q 232 197 249 205 Q 265 211 332 221 Q 408 239 506 247 L 557 250 Z`,
  ];

  const highlightedStrokes = new Set(highlight);

  return (
    <Svg viewBox="0 0 1024 1024" width="256" height="256" className="size-8">
      {/* <G
        stroke="lightgray"
        strokeDasharray="1,1"
        strokeWidth="1"
        transform="scale(4, 4)"
      >
        <Line x1="0" y1="0" x2="256" y2="256" />
        <Line x1="256" y1="0" x2="0" y2="256" />
        <Line x1="128" y1="0" x2="128" y2="256" />
        <Line x1="0" y1="128" x2="256" y2="128" />
      </G> */}
      <G transform="scale(1, -1) translate(0, -900)">
        {strokes
          .filter((_, i) => !highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss key={i} d={d} className="fill-fg-bg50" />
          ))}
        {strokes
          .filter((_, i) => highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss
              key={i}
              d={d}
              className="fill-fg-loud stroke-yellow"
              strokeWidth={120}
            />
          ))}
        {strokes
          .filter((_, i) => highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss
              key={i}
              d={d}
              className="fill-bg-loud stroke-bg-loud"
              strokeWidth={20}
            />
          ))}
      </G>
    </Svg>
  );
};

type PathCssProps = Pick<
  React.SVGProps<SVGPathElement>,
  `d` | `className` | `strokeWidth`
>;

const PathCssRn = cssInterop(Path, {
  className: {
    target: false,
    nativeStyleToProp: {
      fill: true,
      stroke: true,
    },
  },
});

const PathCssWeb = (props: PathCssProps) => {
  return <path {...props} />;
};

const PathCss = Platform.select<React.ComponentType<PathCssProps>>({
  web: PathCssWeb,
  default: PathCssRn,
});
