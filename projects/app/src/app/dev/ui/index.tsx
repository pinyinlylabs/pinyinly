import { Section } from "@/client/ui/demo/helpers";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { FunctionComponent } from "react";
import { lazy } from "react";

export default function UiDemoIndexPage() {
  return (
    <>
      {Object.entries(demos).map(([name, Demo]) => (
        <Section key={name} title={name} href={`/dev/ui/${name}`}>
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
  [`Colors`]: lazyDemo(() => import(`../../../client/ui/Colors.demo`)),
  [`HanziText`]: lazyDemo(() => import(`../../../client/ui/HanziText.demo`)),
  [`IconImage`]: lazyDemo(() => import(`../../../client/ui/IconImage.demo`)),
  [`Icons`]: lazyDemo(() => import(`../../../client/ui/Icons.demo`)),
  [`ImageCloud`]: lazyDemo(() => import(`../../../client/ui/ImageCloud.demo`)),
  [`Mdx`]: lazyDemo(() => import(`../../../client/ui/Mdx.demo`)),
  [`NewSkillModal`]: lazyDemo(() => import(`../../../client/ui/NewSkillModal.demo`)),
  [`NewSkillModalContentNewWord`]: lazyDemo(() => import(`../../../client/ui/NewSkillModalContentNewWord.demo`)),
  [`NewSprout`]: lazyDemo(() => import(`../../../client/ui/NewSprout.demo`)),
  [`NewWordTutorial`]: lazyDemo(() => import(`../../../client/ui/NewWordTutorial.demo`)),
  [`PinyinOptionButton`]: lazyDemo(() => import(`../../../client/ui/PinyinOptionButton.demo`)),
  [`Pylymark`]: lazyDemo(() => import(`../../../client/ui/Pylymark.demo`)),
  [`PylymarkTypewriter`]: lazyDemo(() => import(`../../../client/ui/PylymarkTypewriter.demo`)),
  [`QuizDeckHanziToPinyinQuestion`]: lazyDemo(() => import(`../../../client/ui/QuizDeckHanziToPinyinQuestion.demo`)),
  [`QuizFlagText`]: lazyDemo(() => import(`../../../client/ui/QuizFlagText.demo`)),
  [`QuizProgressBar`]: lazyDemo(() => import(`../../../client/ui/QuizProgressBar.demo`)),
  [`QuizQueueButton`]: lazyDemo(() => import(`../../../client/ui/QuizQueueButton.demo`)),
  [`RectButton`]: lazyDemo(() => import(`../../../client/ui/RectButton.demo`)),
  [`ShootingStars`]: lazyDemo(() => import(`../../../client/ui/ShootingStars.demo`)),
  [`SkillTile`]: lazyDemo(() => import(`../../../client/ui/SkillTile.demo`)),
  [`TextAnswerButton`]: lazyDemo(() => import(`../../../client/ui/TextAnswerButton.demo`)),
  [`TextInputSingle`]: lazyDemo(() => import(`../../../client/ui/TextInputSingle.demo`)),
  [`ToggleButton`]: lazyDemo(() => import(`../../../client/ui/ToggleButton.demo`)),
  [`TutorialDialogBox`]: lazyDemo(() => import(`../../../client/ui/TutorialDialogBox.demo`)),
  [`Typography`]: lazyDemo(() => import(`../../../client/ui/Typography.demo`)),
  [`WikiHanziModal`]: lazyDemo(() => import(`../../../client/ui/WikiHanziModal.demo`)),
  [`WikiHanziWordModal`]: lazyDemo(() => import(`../../../client/ui/WikiHanziWordModal.demo`)),
// </pyly-glob-template>
};
