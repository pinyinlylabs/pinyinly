import { classNameLintInvariant } from "#client/ui/IconImage.tsx";
import test from "node:test";

await test(`${classNameLintInvariant.name} suite`, async (t) => {
  await t.test(`does not allow size- classes`, async () => {
    expect(() => {
      classNameLintInvariant(`size-[32px]`);
    }).toThrow();
    expect(() => {
      classNameLintInvariant(`other-class size-[32px]`);
    }).toThrow();
  });

  await t.test(`does not allow transparent text colors`, async () => {
    expect(() => {
      classNameLintInvariant(`text-fg/50`);
    }).toThrow();
    expect(() => {
      classNameLintInvariant(`other-class text-fg/50`);
    }).toThrow();
  });

  await t.test(`allows opaque text colors`, async () => {
    expect(() => {
      classNameLintInvariant(`text-fg-bg50`);
    }).not.toThrow();
  });

  await t.test(`allows other normal classes`, async () => {
    expect(() => {
      classNameLintInvariant(`flex-1 shrink mt-5 bg-[blue]/50`);
    }).not.toThrow();
  });
});
