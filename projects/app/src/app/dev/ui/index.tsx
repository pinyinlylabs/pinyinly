import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { FunctionComponent } from "react";
import { lazy } from "react";
import { Section } from "./_helpers";

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
  // <pyly-glob-template dir="_demos/" glob="*.tsx" template="  ${filenameWithoutExt}: lazyDemo(() => import(`${pathWithoutExt}`)),">
  Colors: lazyDemo(() => import(`./_demos/Colors`)),
  HanziText: lazyDemo(() => import(`./_demos/HanziText`)),
  IconImage: lazyDemo(() => import(`./_demos/IconImage`)),
  Icons: lazyDemo(() => import(`./_demos/Icons`)),
  ImageCloud: lazyDemo(() => import(`./_demos/ImageCloud`)),
  Mdx: lazyDemo(() => import(`./_demos/Mdx`)),
  NewSkillModal: lazyDemo(() => import(`./_demos/NewSkillModal`)),
  NewSprout: lazyDemo(() => import(`./_demos/NewSprout`)),
  NewWordTutorial: lazyDemo(() => import(`./_demos/NewWordTutorial`)),
  PinyinOptionButton: lazyDemo(() => import(`./_demos/PinyinOptionButton`)),
  Pylymark: lazyDemo(() => import(`./_demos/Pylymark`)),
  PylymarkTypewriter: lazyDemo(() => import(`./_demos/PylymarkTypewriter`)),
  QuizDeckHanziToPinyinQuestion: lazyDemo(() => import(`./_demos/QuizDeckHanziToPinyinQuestion`)),
  QuizFlagText: lazyDemo(() => import(`./_demos/QuizFlagText`)),
  QuizProgressBar: lazyDemo(() => import(`./_demos/QuizProgressBar`)),
  QuizQueueButton: lazyDemo(() => import(`./_demos/QuizQueueButton`)),
  RectButton: lazyDemo(() => import(`./_demos/RectButton`)),
  ShootingStars: lazyDemo(() => import(`./_demos/ShootingStars`)),
  SkillTile: lazyDemo(() => import(`./_demos/SkillTile`)),
  TextAnswerButton: lazyDemo(() => import(`./_demos/TextAnswerButton`)),
  TextInputSingle: lazyDemo(() => import(`./_demos/TextInputSingle`)),
  ToggleButton: lazyDemo(() => import(`./_demos/ToggleButton`)),
  TutorialDialogBox: lazyDemo(() => import(`./_demos/TutorialDialogBox`)),
  Typography: lazyDemo(() => import(`./_demos/Typography`)),
  WikiHanziModal: lazyDemo(() => import(`./_demos/WikiHanziModal`)),
  WikiHanziWordModal: lazyDemo(() => import(`./_demos/WikiHanziWordModal`)),
// </pyly-glob-template>
};
