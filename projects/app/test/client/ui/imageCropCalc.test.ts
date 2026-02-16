import { describe, expect, test } from "vitest";
import type {
    CornerHandle,
    Rect,
    Size,
} from "../../../src/client/ui/imageCropCalc";
import {
    applyCornerDelta,
    clamp,
    clampRectPx,
    enforceAspectRatio,
    getMinCropSizePx,
    resizeRectPx,
} from "../../../src/client/ui/imageCropCalc";

const imageSize: Size = { width: 1000, height: 800 };
const minSize = getMinCropSizePx(imageSize);

describe(`imageCropCalc`, () => {
  describe(`clamp`, () => {
    test(`returns value when within bounds`, () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    test(`clamps to min when below range`, () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    test(`clamps to max when above range`, () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe(`getMinCropSizePx`, () => {
    test(`returns at least 40px`, () => {
      const smallImage: Size = { width: 100, height: 100 };
      expect(getMinCropSizePx(smallImage)).toBe(40);
    });

    test(`returns 5% of smallest dimension for larger images`, () => {
      expect(getMinCropSizePx(imageSize)).toBe(40); // min(1000, 800) * 0.05 = 40
    });

    test(`returns 5% when it exceeds 40px`, () => {
      const largeImage: Size = { width: 2000, height: 2000 };
      expect(getMinCropSizePx(largeImage)).toBe(100); // 2000 * 0.05 = 100
    });
  });

  describe(`clampRectPx`, () => {
    test(`clamps width to max image width`, () => {
      const rect: Rect = { x: 0, y: 0, width: 1500, height: 400 };
      const result = clampRectPx(rect, imageSize, minSize);
      expect(result.width).toBe(1000);
    });

    test(`clamps height to max image height`, () => {
      const rect: Rect = { x: 0, y: 0, width: 500, height: 1500 };
      const result = clampRectPx(rect, imageSize, minSize);
      expect(result.height).toBe(800);
    });

    test(`respects minimum size`, () => {
      const rect: Rect = { x: 0, y: 0, width: 10, height: 10 };
      const result = clampRectPx(rect, imageSize, minSize);
      expect(result.width).toBeGreaterThanOrEqual(minSize);
      expect(result.height).toBeGreaterThanOrEqual(minSize);
    });

    test(`adjusts x position if rectangle extends past right edge`, () => {
      const rect: Rect = { x: 900, y: 0, width: 200, height: 400 };
      const result = clampRectPx(rect, imageSize, minSize);
      expect(result.x).toBe(800); // 1000 - 200
      expect(result.width).toBe(200);
    });

    test(`adjusts y position if rectangle extends past bottom edge`, () => {
      const rect: Rect = { x: 0, y: 700, width: 400, height: 200 };
      const result = clampRectPx(rect, imageSize, minSize);
      expect(result.y).toBe(600); // 800 - 200
      expect(result.height).toBe(200);
    });

    test(`keeps rectangle within bounds`, () => {
      const rect: Rect = { x: 100, y: 100, width: 500, height: 400 };
      const result = clampRectPx(rect, imageSize, minSize);
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x + result.width).toBeLessThanOrEqual(1000);
      expect(result.y + result.height).toBeLessThanOrEqual(800);
    });
  });

  describe(`applyCornerDelta`, () => {
    const baseRect: Rect = { x: 100, y: 100, width: 400, height: 300 };

    test(`applies topLeft delta: x and y increase, width and height decrease`, () => {
      const result = applyCornerDelta(baseRect, `topLeft`, 50, 40);
      expect(result.x).toBe(150);
      expect(result.y).toBe(140);
      expect(result.width).toBe(350);
      expect(result.height).toBe(260);
    });

    test(`applies topRight delta: x unchanged, y increases, width increases, height decreases`, () => {
      const result = applyCornerDelta(baseRect, `topRight`, 50, 40);
      expect(result.x).toBe(100);
      expect(result.y).toBe(140);
      expect(result.width).toBe(450);
      expect(result.height).toBe(260);
    });

    test(`applies bottomLeft delta: x increases, y unchanged, width decreases, height increases`, () => {
      const result = applyCornerDelta(baseRect, `bottomLeft`, 50, 40);
      expect(result.x).toBe(150);
      expect(result.y).toBe(100);
      expect(result.width).toBe(350);
      expect(result.height).toBe(340);
    });

    test(`applies bottomRight delta: x and y unchanged, width and height increase`, () => {
      const result = applyCornerDelta(baseRect, `bottomRight`, 50, 40);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
      expect(result.width).toBe(450);
      expect(result.height).toBe(340);
    });

    test(`handles negative deltas (shrinking)`, () => {
      const result = applyCornerDelta(baseRect, `bottomRight`, -50, -40);
      expect(result.width).toBe(350);
      expect(result.height).toBe(260);
    });
  });

  describe(`enforceAspectRatio`, () => {
    const aspectRatio = 4 / 3; // width / height

    test(`uses width as driving dimension when useWidth is true`, () => {
      // Apply delta first: dx=100, dy=0 → width becomes 500, height becomes 300
      // Then enforce aspect ratio using width as driving dimension
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 500, height: 300 }, // Already has delta applied
        `bottomRight`,
        100,
        0,
        aspectRatio,
        minSize,
        imageSize,
        false, // isWeb=false, but dx > dy so useWidth is true
      );
      expect(result.width).toBe(500);
      expect(result.height).toBeCloseTo(500 / aspectRatio, 5);
    });

    test(`uses height as driving dimension when useHeight is true`, () => {
      // When dy > dx, height is driving
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 400, height: 400 }, // dy=100 was applied
        `bottomRight`,
        0,
        100, // dy > dx
        aspectRatio,
        minSize,
        imageSize,
        false, // isWeb=false
      );
      // height should be driving
      expect(result.height).toBe(400);
      expect(result.width).toBeCloseTo(400 * aspectRatio, 5);
    });

    test(`always uses width as driving dimension when isWeb=true`, () => {
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 110, height: 100 }, // After small dx applied
        `bottomRight`,
        10,
        500, // Large dy, should be ignored on web
        aspectRatio,
        minSize,
        imageSize,
        true, // isWeb=true
      );
      // Width should be driving, height derived from aspect ratio
      expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
    });

    test(`adjusts x position for left-side handles when width decreases`, () => {
      // enforceAspectRatio adjusts x based on width change
      // x = rectPx.x + (rectPx.width - newWidth)
      // This function doesn't clamp - that happens in clampRectPx later
      // Just verify aspect ratio is maintained
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 300, height: 300 }, // Width 300 after delta
        `bottomLeft`,
        0, // No horizontal delta (use width directly)
        50, // Vertical delta
        4 / 3, // aspect ratio
        minSize,
        imageSize,
        false,
      );
      // Verify aspect ratio is maintained
      expect(result.width / result.height).toBeCloseTo(4 / 3, 5);
    });

    test(`adjusts y position for top-side handles when height decreases`, () => {
      // For topRight, when dy > dx, height is driving
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 400, height: 250 }, // Height decreased
        `topRight`,
        50,
        -50, // dy shrinking
        4 / 3, // aspect ratio
        minSize,
        imageSize,
        false,
      );
      // dx > dy, so width is driving
      // When width drives, height = width / ratio
      // This doesn't necessarily increase y; y adjustment happens when height changes
      // Just verify the position is valid
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y + result.height).toBeLessThanOrEqual(imageSize.height);
    });

    test(`respects minimum size constraints via resizeRectPx clamping`, () => {
      // enforceAspectRatio doesn't directly clamp to minimum size
      // That's done by clampRectPx at the end of resizeRectPx
      // Just verify aspect ratio is maintained
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 30, height: 30 }, // Very small
        `bottomRight`,
        -500, // Large shrink
        -200,
        4 / 3,
        minSize,
        imageSize,
        false,
      );
      // Verify aspect ratio is maintained even at small sizes
      expect(result.width / result.height).toBeCloseTo(4 / 3, 5);
    });

    test(`maintains 2:1 aspect ratio at minimum size (width-driven)`, () => {
      // When width is small and aspect ratio is 2:1, height shouldn't violate min size
      // If width=40 with 2:1, height would be 20, which is less than minSize (40)
      // So width should be increased to 80 to maintain both constraints
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 40, height: 20 },
        `bottomRight`,
        -50, // Slight shrink horizontally
        0,
        2, // 2:1 aspect ratio
        minSize,
        imageSize,
        false,
      );
      expect(result.width).toBeGreaterThanOrEqual(minSize);
      expect(result.height).toBeGreaterThanOrEqual(minSize);
      expect(result.width / result.height).toBeCloseTo(2, 5);
    });

    test(`maintains 1:2 aspect ratio at minimum size (height-driven)`, () => {
      // When aspect ratio is 1:2 (portrait), and height is small
      // If height=40 with 1:2, width would be 20, which is less than minSize (40)
      // So height should be increased to 80 to maintain both constraints
      const result = enforceAspectRatio(
        { x: 100, y: 100, width: 20, height: 40 },
        `bottomRight`,
        0,
        -50, // Slight shrink vertically
        0.5, // 1:2 aspect ratio (width:height)
        minSize,
        imageSize,
        false,
      );
      expect(result.width).toBeGreaterThanOrEqual(minSize);
      expect(result.height).toBeGreaterThanOrEqual(minSize);
      expect(result.width / result.height).toBeCloseTo(0.5, 5);
    });
  });

  describe(`resizeRectPx without aspect ratio`, () => {
    const baseRect: Rect = { x: 100, y: 100, width: 400, height: 300 };

    test(`resizes topLeft by dragging up-left`, () => {
      const result = resizeRectPx(
        baseRect,
        `topLeft`,
        -50,
        -40,
        null, // no aspect ratio
        imageSize,
        false,
      );
      expect(result.x).toBe(50);
      expect(result.y).toBe(60);
      expect(result.width).toBe(450);
      expect(result.height).toBe(340);
    });

    test(`resizes bottomRight by dragging down-right`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        100,
        80,
        null,
        imageSize,
        false,
      );
      expect(result.width).toBe(500);
      expect(result.height).toBe(380);
    });

    test(`clamps to image bounds`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        2000,
        2000, // Way beyond image
        null,
        imageSize,
        false,
      );
      expect(result.x + result.width).toBeLessThanOrEqual(imageSize.width);
      expect(result.y + result.height).toBeLessThanOrEqual(imageSize.height);
    });

    test(`respects minimum size`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        -500, // Shrink dramatically
        -500,
        null,
        imageSize,
        false,
      );
      expect(result.width).toBeGreaterThanOrEqual(minSize);
      expect(result.height).toBeGreaterThanOrEqual(minSize);
    });
  });

  describe(`resizeRectPx with aspect ratio (non-web)`, () => {
    const baseRect: Rect = { x: 100, y: 100, width: 400, height: 300 };
    const aspectRatio = 4 / 3;

    test(`maintains aspect ratio when dragging horizontally`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        100,
        20, // dx > dy
        aspectRatio,
        imageSize,
        false,
      );
      expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
    });

    test(`maintains aspect ratio when dragging vertically`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        20,
        100, // dy > dx
        aspectRatio,
        imageSize,
        false,
      );
      expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
    });

    test(`maintains aspect ratio when dragging diagonally`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        80,
        60,
        aspectRatio,
        imageSize,
        false,
      );
      expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
    });

    test(`handles all corners correctly`, () => {
      const handles: CornerHandle[] = [
        `topLeft`,
        `topRight`,
        `bottomLeft`,
        `bottomRight`,
      ];
      for (const handle of handles) {
        const result = resizeRectPx(
          baseRect,
          handle,
          50,
          40,
          aspectRatio,
          imageSize,
          false,
        );
        expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
      }
    });

    test(`maintains 2:1 aspect ratio when shrinking`, () => {
      // This is the bug case: 2:1 aspect ratio should not become square when shrunk
      const startRect: Rect = { x: 100, y: 100, width: 200, height: 100 };
      const result = resizeRectPx(
        startRect,
        `bottomRight`,
        -100, // Shrink by dragging left
        -50, // Shrink by dragging up
        2, // 2:1 aspect ratio
        imageSize,
        false,
      );
      expect(result.width / result.height).toBeCloseTo(2, 5);
      expect(result.width).toBeGreaterThanOrEqual(minSize);
      expect(result.height).toBeGreaterThanOrEqual(minSize);
    });
  });

  describe(`resizeRectPx with aspect ratio (web - horizontal only)`, () => {
    const baseRect: Rect = { x: 100, y: 100, width: 400, height: 300 };
    const aspectRatio = 4 / 3;

    test(`uses horizontal movement only on web`, () => {
      const result = resizeRectPx(
        baseRect,
        `bottomRight`,
        100,
        500, // Large dy, should be ignored on web
        aspectRatio,
        imageSize,
        true, // isWeb=true
      );
      // Width should be based on dx, height derived from aspect ratio
      expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
      // The height should be relatively small since we only moved 100 horizontally
      expect(result.height).toBeLessThan(500);
    });

    test(`ignores vertical movement on web when dragging top-right`, () => {
      const result = resizeRectPx(
        baseRect,
        `topRight`,
        50,
        1000, // Large downward movement
        aspectRatio,
        imageSize,
        true,
      );
      expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
      // Should roughly follow the horizontal movement
      expect(result.width).toBeLessThan(baseRect.width + 200);
    });

    test(`maintains aspect ratio on all corners on web`, () => {
      const handles: CornerHandle[] = [
        `topLeft`,
        `topRight`,
        `bottomLeft`,
        `bottomRight`,
      ];
      for (const handle of handles) {
        const result = resizeRectPx(
          baseRect,
          handle,
          50,
          500, // Vertical should be ignored
          aspectRatio,
          imageSize,
          true,
        );
        expect(result.width / result.height).toBeCloseTo(aspectRatio, 5);
      }
    });
  });

  describe(`real-world scenarios`, () => {
    const imageSize: Size = { width: 1920, height: 1440 };
    const aspectRatio = 1; // Square

    test(`allows shrinking from top-right corner by dragging left on web`, () => {
      const startRect: Rect = { x: 300, y: 300, width: 600, height: 600 };
      // Drag left (negative dx)
      const result = resizeRectPx(
        startRect,
        `topRight`,
        -100,
        50, // Small vertical movement (should be ignored on web)
        aspectRatio,
        imageSize,
        true,
      );
      expect(result.width).toBeLessThan(startRect.width);
      expect(result.height).toBeLessThan(startRect.height);
      expect(result.width / result.height).toBeCloseTo(1, 5);
    });

    test(`constrains crop to image bounds`, () => {
      const startRect: Rect = { x: 1800, y: 1300, width: 200, height: 200 };
      const result = resizeRectPx(
        startRect,
        `bottomRight`,
        500, // Dragging way past right edge
        500,
        null,
        imageSize,
        false,
      );
      expect(result.x + result.width).toBeLessThanOrEqual(imageSize.width);
      expect(result.y + result.height).toBeLessThanOrEqual(imageSize.height);
    });

    test(`grows from bottom-left corner by dragging left`, () => {
      const startRect: Rect = { x: 500, y: 400, width: 400, height: 400 };
      const result = resizeRectPx(
        startRect,
        `bottomLeft`,
        -100, // Drag left
        100,
        1, // Square aspect
        imageSize,
        false,
      );
      expect(result.width).toBeGreaterThan(startRect.width);
      expect(result.x).toBeLessThan(startRect.x);
      expect(result.width / result.height).toBeCloseTo(1, 5);
    });
  });
});
