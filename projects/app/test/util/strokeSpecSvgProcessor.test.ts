import type { StrokeSpecString } from "#data/model.js";
import {
  buildClosedSvgSegmentPathFromStrokeSpec,
  buildSvgSegmentPathFromLengths,
  buildStrokeSpecSegmentPaths,
  getSvgPathIntersections,
} from "#util/strokeSpecSvgProcessor.js";
import { describe, expect, test } from "vitest";

describe(`buildStrokeSpecSegmentPaths`, () => {
  const zhong = {
    strokes: [
      "M 511 707 Q 598 740 657 747 Q 673 747 678 754 Q 682 764 672 776 Q 653 794 610 815 Q 595 824 582 823 Q 575 820 573 809 Q 569 767 331 684 Q 324 683 318 680 Q 312 671 318 668 Q 330 665 444 691 Q 454 694 466 696 L 511 707 Z",
      "M 541 578 Q 655 590 815 590 Q 891 587 899 599 Q 905 611 888 625 Q 833 667 768 652 Q 677 636 542 613 L 492 606 Q 332 587 145 563 Q 123 562 139 543 Q 172 513 211 522 Q 361 564 493 573 L 541 578 Z",
      "M 320 478 Q 310 482 292 485 Q 280 488 277 483 Q 270 476 279 461 Q 310 395 327 289 Q 330 258 348 236 Q 366 214 371 229 Q 372 236 374 247 L 374 274 Q 373 286 371 299 Q 352 411 347 445 C 343 470 343 470 320 478 Z",
      "M 636 274 Q 655 246 673 237 Q 683 230 699 251 Q 712 273 739 390 Q 748 423 773 448 Q 786 461 774 476 Q 758 494 714 521 Q 698 530 636 517 Q 597 516 539 505 L 493 500 Q 471 499 450 495 Q 377 483 320 479 Q 319 479 320 478 C 290 474 317 441 347 445 Q 353 445 360 446 Q 412 458 492 466 L 538 471 Q 578 477 624 480 Q 661 483 672 470 Q 684 457 682 443 Q 663 308 643 298 C 631 281 631 281 636 274 Z",
      "M 492 393 Q 452 386 415 376 Q 399 373 418 358 Q 427 351 446 354 Q 468 358 491 360 L 537 365 Q 571 371 602 373 Q 624 377 617 389 Q 607 402 583 408 Q 565 412 538 405 L 492 393 Z",
      "M 535 263 Q 589 270 636 274 C 666 277 668 281 643 298 Q 612 323 536 302 L 489 293 Q 428 283 374 274 C 344 269 344 249 374 247 Q 384 246 403 247 Q 448 254 489 257 L 535 263 Z",
      "M 533 36 Q 533 85 533 132 L 534 172 Q 534 218 535 263 L 536 302 Q 536 335 537 365 L 538 405 Q 538 439 538 471 L 539 505 Q 540 542 541 578 L 542 613 Q 543 635 544 653 Q 551 672 541 683 Q 525 699 511 707 C 487 724 454 724 466 696 Q 473 677 483 661 Q 490 639 492 606 L 493 573 Q 493 554 493 500 L 492 466 Q 492 435 492 393 L 491 360 Q 490 329 489 293 L 489 257 Q 488 214 487 164 L 486 126 Q 485 83 485 32 C 485 2 533 6 533 36 Z",
      "M 533 132 Q 584 141 658 143 Q 667 142 676 152 Q 677 162 657 173 Q 627 195 539 173 Q 536 173 534 172 L 487 164 Q 439 158 361 154 Q 336 151 354 135 Q 376 117 414 116 Q 445 122 486 126 L 533 132 Z",
      "M 485 32 Q 355 23 205 13 Q 184 12 199 -6 Q 212 -19 229 -26 Q 248 -32 265 -28 Q 488 20 837 -2 Q 856 -2 861 6 Q 867 16 852 31 Q 801 70 766 65 Q 678 52 533 36 L 485 32 Z",
    ],
    medians: [
      "M 668 760 L 601 776 L 512 731 L 429 701 L 419 703 L 354 682 L 345 685 L 320 674",
      "M 142 553 L 200 545 L 366 575 L 794 623 L 842 619 L 890 605",
      "M 286 475 L 307 458 L 322 428 L 361 235",
      "M 327 479 L 362 464 L 651 501 L 688 496 L 704 487 L 725 458 L 674 278 L 679 256",
      "M 416 367 L 564 390 L 606 384",
      "M 380 254 L 389 261 L 634 294",
      "M 475 692 L 508 675 L 517 621 L 509 71 L 507 57 L 490 40",
      "M 357 145 L 407 136 L 606 163 L 667 154",
      "M 202 3 L 256 -7 L 563 23 L 764 33 L 800 30 L 850 12",
    ],
  };

  test(`throws an error when medians are missing`, () => {
    expect(() =>
      buildStrokeSpecSegmentPaths(zhong.strokes, undefined, [
        `0[1:2]` as StrokeSpecString,
      ]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[InvariantException: Failed to build path for atom: 0[1:2]]`,
    );
  });

  test(`throws an error for invalid slices are missing`, () => {
    expect(() =>
      buildStrokeSpecSegmentPaths(zhong.strokes, zhong.medians, [
        `2[4:]` as StrokeSpecString,
      ]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[InvariantException: Failed to build path for atom: 2[4:]]`,
    );
  });

  //
  test(`builds segment maps from single stroke spec text`, () => {
    expect(
      buildStrokeSpecSegmentPaths(zhong.strokes, zhong.medians, [
        `0,1,6[:5]` as StrokeSpecString,
      ]),
    ).toMatchObject({
      [`6[:5]`]: expect.any(String),
    });
  });

  test(`builds segment maps from multiple stroke spec text`, () => {
    expect(
      buildStrokeSpecSegmentPaths(zhong.strokes, zhong.medians, [
        "0,1,6[:5]" as StrokeSpecString,
        "2-5,6[4:],7,8" as StrokeSpecString,
      ]),
    ).toMatchObject({
      [`6[:5]`]: expect.any(String),
      [`6[4:]`]: expect.any(String),
    });
  });
});

describe(`buildSvgSegmentPathFromLengths()`, () => {
  test(`buildSvgSegmentPathFromLengths preserves curve commands on curved paths`, () => {
    const segment = buildSvgSegmentPathFromLengths(
      `M 0 0 C 0 100 100 100 100 0`,
      40,
      160,
    );

    expect(segment).toMatchInlineSnapshot(
      `"M 6.45 39.26 C 24.53 86.95 75.57 86.91 93.59 39.14"`,
    );
  });
});

describe(`buildClosedSvgSegmentPathFromStrokeSpec()`, () => {
  test(`builds a closed cut from StrokeSpec with explicit target/cutter IDs`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[1#0:1#1]`,
    });

    expect(segment).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 9 4 8 4 7 C 2.67 7 1.33 7 0 7 C 0 8 0 9 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 2.67 3 1.33 3 0 3 Z"`,
    );
  });

  test(`supports open StrokeSpec bounds for median occurrences`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[:1#1]`,
    });

    expect(segment).not.toBeNull();
    expect(segment).toContain(` Z`);
  });

  test(`fills whole stroke for single range StrokeSpec`, () => {
    const targetPath = `M 0 0 L 0 10 L 4 10 L 4 0 Z`;
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: targetPath,
      },
      strokeSpecText: `0`,
    });

    expect(segment).toBe(targetPath);
  });

  test(`open-bound semantics: 0[:1] keeps start-to-cut and 0[1:] keeps cut-to-end`, () => {
    const fromStart = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[:1]`,
    });

    expect(fromStart).toMatchInlineSnapshot(
      `"M 4 3 C 4 2 4 1 4 0 C 2.67 0 1.33 0 0 0 C 0 0 0 3 0 3 C 1.33 3 2.67 3 4 3 Z"`,
    );

    const toEnd = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[1:]`,
    });

    expect(toEnd).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 2.67 3 1.33 3 0 3 Z"`,
    );
  });

  test(`supports percent open bounds on median path`, () => {
    const fromStart = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[:5%]`,
    });
    expect(fromStart).toMatchInlineSnapshot(
      `"M 4 0.5 C 4 0.33 4 0.17 4 0 C 2.67 0 1.33 0 0 0 C 0 0 0 0.5 0 0.5 C 1.33 0.5 2.67 0.5 4 0.5 Z"`,
    );

    const toEnd = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[5%:]`,
    });

    expect(toEnd).toMatchInlineSnapshot(
      `"M 0 0.5 C 0 3.67 0 6.83 0 10 C 1.33 10 2.67 10 4 10 C 4 6.83 4 3.67 4 0.5 C 2.67 0.5 1.33 0.5 0 0.5 Z"`,
    );
  });

  test(`supports percent-to-percent and mixed stroke/percent bounds`, () => {
    const percentSegment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[5%:95%]`,
    });
    expect(percentSegment).toMatchInlineSnapshot(
      `"M 4 9.5 C 4 6.5 4 3.5 4 0.5 C 4 0.5 4 9.5 4 9.5 C 2.67 9.5 1.33 9.5 0 9.5 C 0 9.5 0 0.5 0 0.5 C 0 3.5 0 6.5 0 9.5 C 0 9.5 0 0.5 0 0.5 C 1.33 0.5 2.67 0.5 4 0.5 Z"`,
    );

    const mixedSegmentA = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[5%:1]`,
    });
    expect(mixedSegmentA).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 6.83 4 3.67 4 0.5 C 4 0.5 0 3 0 3 C 1.33 3 2.67 3 4 3 C 4 3 0 0.5 0 0.5 C 0 3.67 0 6.83 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 4 3 0 0.5 0 0.5 C 1.33 0.5 2.67 0.5 4 0.5 Z"`,
    );

    const mixedSegmentB = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[1:95%]`,
    });
    expect(mixedSegmentB).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 9.83 4 9.67 4 9.5 C 2.67 9.5 1.33 9.5 0 9.5 C 0 9.67 0 9.83 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 2.67 3 1.33 3 0 3 Z"`,
    );
  });

  test(`supports two-cutter slice as fill between cut line 1 and cut line 2`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 12 L 6 12 L 6 0 Z`,
        1: `M -2 3 L 8 3`,
        2: `M -2 9 L 8 9`,
      },
      medianPathsById: {
        0: `M 3 0 L 3 12`,
      },
      strokeSpecText: `0[1:2]`,
    });
    expect(segment).toMatchInlineSnapshot(
      `"M 0 3 C 0 5 0 7 0 9 C 2 9 4 9 6 9 C 6 7 6 5 6 3 C 4 3 2 3 0 3 Z"`,
    );
  });

  test(`uses referenced stroke medians (not outlines) for 0[1:2] cutter seams`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 12 L 6 12 L 6 0 Z`,
        // These outlines do not intersect stroke 0, so using outlines would fail.
        1: `M 20 2 L 26 2 L 26 4 L 20 4 Z`,
        2: `M 20 8 L 26 8 L 26 10 L 20 10 Z`,
      },
      medianPathsById: {
        0: `M 3 0 L 3 12`,
        // These medians do intersect stroke 0 and should be used as cut lines.
        1: `M -2 3 L 8 3`,
        2: `M -2 9 L 8 9`,
      },
      strokeSpecText: `0[1:2]`,
    });

    expect(segment).toMatchInlineSnapshot(
      `"M 0 3 C 0 5 0 7 0 9 C 2 9 4 9 6 9 C 6 7 6 5 6 3 C 4 3 2 3 0 3 Z"`,
    );
  });
});

describe(`getSvgPathIntersections()`, () => {
  test(`lists intersections for a target and cutter path`, () => {
    const intersections = getSvgPathIntersections(
      `M 0 0 L 10 0`,
      `M 2 -5 L 5 5 L 8 -5`,
    );

    expect(intersections).toMatchInlineSnapshot(`
      [
        {
          "boundaryLength": 5.22021484375,
          "length": 3.5,
          "t1": 0.35000001043081325,
          "t2": 0.5000000149011611,
          "x": 3.500000000000001,
          "y": -0,
        },
        {
          "boundaryLength": 15.66064453125,
          "length": 6.5,
          "t1": 0.6500000104308129,
          "t2": 0.5000000149011616,
          "x": 6.5000000000000036,
          "y": -0,
        },
      ]
    `);
  });
});
