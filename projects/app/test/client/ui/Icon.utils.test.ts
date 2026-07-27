import {
  classNameLintInvariant,
  tintColorClassNameInvariant,
} from "#client/ui/Icon.utils.ts";
import { describe, expect, test } from "vitest";

describe(
  `classNameLintInvariant suite` satisfies HasNameOf<
    typeof classNameLintInvariant
  >,
  () => {
    test(`does not allow size- classes`, () => {
      expect(() => {
        classNameLintInvariant(`size-[32px]`);
      }).toThrow();
      expect(() => {
        classNameLintInvariant(`other-class size-[32px]`);
      }).toThrow();
    });

    test(`does not allow transparent text colors`, () => {
      expect(() => {
        classNameLintInvariant(`text-fg/50`);
      }).toThrow();
      expect(() => {
        classNameLintInvariant(`other-class text-fg/50`);
      }).toThrow();
    });

    test(`does not allow text-* classes`, () => {
      expect(() => {
        classNameLintInvariant(`text-fg-bg50`);
      }).toThrow();
    });

    test(`allows other normal classes`, () => {
      expect(() => {
        classNameLintInvariant(`flex-1 shrink mt-5 bg-[blue]/50`);
      }).not.toThrow();
    });
  },
);

describe(
  `tintColorClassNameInvariant suite` satisfies HasNameOf<
    typeof tintColorClassNameInvariant
  >,
  () => {
    test(`does not allow non-accent classes`, () => {
      expect(() => {
        tintColorClassNameInvariant(`text-fg`);
      }).toThrow();
      expect(() => {
        tintColorClassNameInvariant(`accent-fg text-fg`);
      }).toThrow();
      expect(() => {
        tintColorClassNameInvariant(`accent-fg`);
      }).not.toThrow();
    });

    test(`does not allow transparent colors`, () => {
      expect(() => {
        tintColorClassNameInvariant(`accent-fg/50`);
      }).toThrow();
    });
  },
);
