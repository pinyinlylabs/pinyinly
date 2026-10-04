import type { CollectionOutput, SettingCollection } from "@/client/query";
import type { Rizzle } from "@/data/rizzleSchema";
import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { studyWordItemSetting } from "@/data/userSettings";
import { like, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useRef, useState } from "react";

const legacyStudySelectionsCleanupExpiresAt = Date.parse(
  `2026-11-03T00:00:00.000Z`,
);

export function LegacyStudySelectionsCleanup() {
  const [active, setActive] = useState(
    () => Date.now() < legacyStudySelectionsCleanupExpiresAt,
  );
  useEffect(() => {
    if (!active) {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const checkExpiry = () => {
      const remaining = legacyStudySelectionsCleanupExpiresAt - Date.now();
      if (remaining <= 0) {
        setActive(false);
      } else {
        timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
      }
    };
    checkExpiry();
    return () => {
      clearTimeout(timer);
    };
  }, [active]);

  return active ? <ActiveLegacyStudySelectionsCleanup /> : null;
}

LegacyStudySelectionsCleanup.expiresAt = legacyStudySelectionsCleanupExpiresAt;

async function removeLegacyStudyWords(
  settings: readonly CollectionOutput<SettingCollection>[],
  rizzle: Rizzle,
): Promise<void> {
  for (const setting of settings) {
    if (
      Date.now() >= legacyStudySelectionsCleanupExpiresAt ||
      setting.value == null ||
      !setting.key.startsWith(studyWordItemSetting.entity.keyPrefix)
    ) {
      continue;
    }
    let hanziWord: string;
    try {
      hanziWord = studyWordItemSetting.entity.unmarshalKey(
        setting.key,
      ).hanziWord;
    } catch {
      continue;
    }
    if (hanziWord.includes(`:`)) {
      continue;
    }
    await rizzle.mutate.setSetting({
      key: setting.key,
      value: null,
      now: new Date(),
      skipHistory: true,
    });
  }
}

function ActiveLegacyStudySelectionsCleanup() {
  const db = useDb();
  const rizzle = useRizzle();
  const pending = useRef(new Set<string>());
  const { data: settings, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ setting: db.settingCollection })
        .where(({ setting }) =>
          like(setting.key, `${studyWordItemSetting.entity.keyPrefix}%`),
        ),
    [db.settingCollection],
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }
    for (const setting of settings) {
      if (Date.now() >= legacyStudySelectionsCleanupExpiresAt) {
        return;
      }
      if (pending.current.has(setting.key)) {
        continue;
      }
      pending.current.add(setting.key);
      void removeLegacyStudyWords([setting], rizzle)
        .catch((error: unknown) => {
          console.error(`Could not remove legacy Study selection`, error);
        })
        .finally(() => {
          pending.current.delete(setting.key);
        });
    }
  }, [settings, isLoading, rizzle]);

  return null;
}
