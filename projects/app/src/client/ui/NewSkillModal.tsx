/* eslint-disable react/display-name */
import { SkillKind } from "@/data/model";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillKindFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { useState } from "react";
import { NewSkillModalContentNewPronunciation } from "./NewSkillModalContentNewPronunciation";
import { NewSkillModalContentNewWord } from "./NewSkillModalContentNewWord";
import type { PageSheetChild } from "./PageSheetModal";
import { PageSheetModal } from "./PageSheetModal";

export const NewSkillModal = ({
  skill: anySkill,
  passivePresentation,
  devUiSnapshotMode,
}: {
  skill: Skill;
  passivePresentation?: boolean;
  devUiSnapshotMode?: boolean;
}) => {
  const [pageSheetChild, setPageSheetChild] = useState(
    (): PageSheetChild | null => {
      switch (skillKindFromSkill(anySkill)) {
        case SkillKind.HanziWordToGloss: {
          const skill = anySkill as HanziWordSkill;
          const hanzi = hanziFromHanziWord(hanziWordFromSkill(skill));
          return ({ dismiss }) => (
            <NewSkillModalContentNewWord hanzi={hanzi} onDismiss={dismiss} />
          );
        }
        case SkillKind.HanziWordToPinyinInitial: {
          const skill = anySkill as HanziWordSkill;
          const hanzi = hanziFromHanziWord(hanziWordFromSkill(skill));
          return ({ dismiss }) => (
            <NewSkillModalContentNewPronunciation
              hanzi={hanzi}
              onDismiss={dismiss}
            />
          );
        }
        case SkillKind.HanziWordToGlossTyped:
        case SkillKind.HanziWordToPinyinTyped:
        case SkillKind.HanziWordToPinyinTone:
        case SkillKind.HanziWordToPinyinFinal:
        case SkillKind.Deprecated_EnglishToRadical:
        case SkillKind.Deprecated_PinyinToRadical:
        case SkillKind.Deprecated_RadicalToEnglish:
        case SkillKind.Deprecated_RadicalToPinyin:
        case SkillKind.Deprecated:
        case SkillKind.GlossToHanziWord:
        case SkillKind.ImageToHanziWord:
        case SkillKind.PinyinFinalAssociation:
        case SkillKind.PinyinInitialAssociation:
        case SkillKind.PinyinToHanziWord: {
          return null;
        }
      }
    },
  );

  return pageSheetChild ? (
    <PageSheetModal
      disableBackgroundDismiss
      onDismiss={() => {
        setPageSheetChild(null);
      }}
      passivePresentation={passivePresentation}
      devUiSnapshotMode={devUiSnapshotMode}
      suspenseFallback={null}
    >
      {(dismiss) => pageSheetChild(dismiss)}
    </PageSheetModal>
  ) : null;
};
