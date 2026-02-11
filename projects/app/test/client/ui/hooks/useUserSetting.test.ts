import type { UseUserSettingResult } from "#client/ui/hooks/useUserSetting.ts";
import type { HanziWord } from "#data/model.ts";
import { r } from "#util/rizzle.ts";
import { test } from "vitest";

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

test(`useUserSetting setValue types`, () => {
  const testSetting = r.entity(`test.toggle`, {
    enabled: r.boolean(`e`),
  });
  const testSettingWithKeyParam = r.entity(`test.hint.[hanziWord]`, {
    hanziWord: r.string().alias(`h`),
    text: r.string().alias(`t`),
  });

  type ToggleSetValue = UseUserSettingResult<typeof testSetting>[`setValue`];

  typeChecks(() => {
    const setValue = null as unknown as ToggleSetValue;
    setValue({ enabled: true });
    setValue((prev) => ({ enabled: !(prev?.enabled ?? false) }));
    // @ts-expect-error wrong field for entity shape
    setValue({ text: `nope` });
    // @ts-expect-error wrong value type
    setValue({ enabled: `true` });
  });

  type HintSetValue = UseUserSettingResult<
    typeof testSettingWithKeyParam
  >[`setValue`];

  typeChecks(() => {
    const setValue = null as unknown as HintSetValue;
    setValue({ hanziWord: `` as HanziWord, text: `hint` });
    // @ts-expect-error missing key field
    setValue({ text: `hint` });
    // @ts-expect-error wrong field for entity shape
    setValue({ hanziWord: `` as HanziWord, imageId: `x` });
  });
});
