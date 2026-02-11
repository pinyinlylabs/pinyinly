import { Section } from "@/client/ui/demo/components";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { lazy } from "react";
import type { FunctionComponent } from "react";

export default function UiDemoIndexPage() {
  return (
    <>
      {Object.entries(demos).map(([name, Demo]) => (
        <Section key={name} title={name} href={`/dev/demo/${name}`}>
          <Demo />
        </Section>
      ))}
    </>
  );
}

const lazyDemo = <Demo extends FunctionComponent>(
  importFn: () => Promise<{ default: Demo }>,
) =>
  lazy(async () => {
    await devToolsSlowQuerySleepIfEnabled();
    return await importFn();
  });

// prettier-ignore
export const demos: Record<string, FunctionComponent> = {
  // <pyly-glob-template glob="../../../**/*.demo.tsx" template="  [`${filenameWithoutExt.split('.')[0]}`]: lazyDemo(() => import(`${pathWithoutExt}`)),">
  [`CloseButton`]: lazyDemo(() => import(`../../../client/ui/CloseButton.demo`)),
  [`Colors`]: lazyDemo(() => import(`../../../client/ui/Colors.demo`)),
  [`FloatingMenuModal`]: lazyDemo(() => import(`../../../client/ui/FloatingMenuModal.demo`)),
  [`HanziCharacter`]: lazyDemo(() => import(`../../../client/ui/HanziCharacter.demo`)),
  [`HanziHintOption`]: lazyDemo(() => import(`../../../client/ui/HanziHintOption.demo`)),
  [`HanziText`]: lazyDemo(() => import(`../../../client/ui/HanziText.demo`)),
  [`HanziTile`]: lazyDemo(() => import(`../../../client/ui/HanziTile.demo`)),
  [`HanziWordTile`]: lazyDemo(() => import(`../../../client/ui/HanziWordTile.demo`)),
  [`HintImageSettingPicker`]: lazyDemo(() => import(`../../../client/ui/HintImageSettingPicker.demo`)),
  [`IconImage`]: lazyDemo(() => import(`../../../client/ui/IconImage.demo`)),
  [`Icons`]: lazyDemo(() => import(`../../../client/ui/Icons.demo`)),
  [`ImageCloud`]: lazyDemo(() => import(`../../../client/ui/ImageCloud.demo`)),
  [`ImagePasteDropZone`]: lazyDemo(() => import(`../../../client/ui/ImagePasteDropZone.demo`)),
  [`ImageUploadButton`]: lazyDemo(() => import(`../../../client/ui/ImageUploadButton.demo`)),
  [`InlineEditableSettingImage`]: lazyDemo(() => import(`../../../client/ui/InlineEditableSettingImage.demo`)),
  [`InlineEditableSettingText`]: lazyDemo(() => import(`../../../client/ui/InlineEditableSettingText.demo`)),
  [`MenuDictionarySearch`]: lazyDemo(() => import(`../../../client/ui/MenuDictionarySearch.demo`)),
  [`NewSkillModal`]: lazyDemo(() => import(`../../../client/ui/NewSkillModal.demo`)),
  [`NewSkillModalContentNewPronunciation`]: lazyDemo(() => import(`../../../client/ui/NewSkillModalContentNewPronunciation.demo`)),
  [`NewSkillModalContentNewWord`]: lazyDemo(() => import(`../../../client/ui/NewSkillModalContentNewWord.demo`)),
  [`NewSprout`]: lazyDemo(() => import(`../../../client/ui/NewSprout.demo`)),
  [`NewWordTutorial`]: lazyDemo(() => import(`../../../client/ui/NewWordTutorial.demo`)),
  [`PinyinOptionButton`]: lazyDemo(() => import(`../../../client/ui/PinyinOptionButton.demo`)),
  [`PylyMdxComponents`]: lazyDemo(() => import(`../../../client/ui/PylyMdxComponents.demo`)),
  [`Pylymark`]: lazyDemo(() => import(`../../../client/ui/Pylymark.demo`)),
  [`PylymarkTypewriter`]: lazyDemo(() => import(`../../../client/ui/PylymarkTypewriter.demo`)),
  [`QuizDeckHanziWordToGlossTypedQuestion`]: lazyDemo(() => import(`../../../client/ui/QuizDeckHanziWordToGlossTypedQuestion.demo`)),
  [`QuizDeckHanziWordToPinyinTypedQuestion`]: lazyDemo(() => import(`../../../client/ui/QuizDeckHanziWordToPinyinTypedQuestion.demo`)),
  [`QuizDeckResultToast`]: lazyDemo(() => import(`../../../client/ui/QuizDeckResultToast.demo`)),
  [`QuizFlagText`]: lazyDemo(() => import(`../../../client/ui/QuizFlagText.demo`)),
  [`QuizProgressBar`]: lazyDemo(() => import(`../../../client/ui/QuizProgressBar.demo`)),
  [`QuizQueueButton`]: lazyDemo(() => import(`../../../client/ui/QuizQueueButton.demo`)),
  [`RectButton`]: lazyDemo(() => import(`../../../client/ui/RectButton.demo`)),
  [`ShootingStars`]: lazyDemo(() => import(`../../../client/ui/ShootingStars.demo`)),
  [`SkillTile`]: lazyDemo(() => import(`../../../client/ui/SkillTile.demo`)),
  [`TextAnswerButton`]: lazyDemo(() => import(`../../../client/ui/TextAnswerButton.demo`)),
  [`TextAnswerInputSingle`]: lazyDemo(() => import(`../../../client/ui/TextAnswerInputSingle.demo`)),
  [`TextInputSingle`]: lazyDemo(() => import(`../../../client/ui/TextInputSingle.demo`)),
  [`Themes`]: lazyDemo(() => import(`../../../client/ui/Themes.demo`)),
  [`ThreeSplitLinesDown`]: lazyDemo(() => import(`../../../client/ui/ThreeSplitLinesDown.demo`)),
  [`ToggleButton`]: lazyDemo(() => import(`../../../client/ui/ToggleButton.demo`)),
  [`TutorialDialogBox`]: lazyDemo(() => import(`../../../client/ui/TutorialDialogBox.demo`)),
  [`Typography`]: lazyDemo(() => import(`../../../client/ui/Typography.demo`)),
  [`WikiHanziCharacterDecomposition`]: lazyDemo(() => import(`../../../client/ui/WikiHanziCharacterDecomposition.demo`)),
  [`WikiHanziCharacterIntro`]: lazyDemo(() => import(`../../../client/ui/WikiHanziCharacterIntro.demo`)),
  [`WikiHanziHintEditor`]: lazyDemo(() => import(`../../../client/ui/WikiHanziHintEditor.demo`)),
  [`WikiHanziModal`]: lazyDemo(() => import(`../../../client/ui/WikiHanziModal.demo`)),
// </pyly-glob-template>
};
