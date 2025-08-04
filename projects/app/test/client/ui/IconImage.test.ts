import { classNameLintInvariant } from "#client/ui/IconImage.tsx";
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

    test(`allows opaque text colors`, () => {
      expect(() => {
        classNameLintInvariant(`text-fg-bg50`);
      }).not.toThrow();
    });

    test(`allows other normal classes`, () => {
      expect(() => {
        classNameLintInvariant(`flex-1 shrink mt-5 bg-[blue]/50`);
      }).not.toThrow();
    });
  },
);
