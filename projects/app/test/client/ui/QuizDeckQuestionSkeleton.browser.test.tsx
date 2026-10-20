import { QuizDeckQuestionSkeleton } from "#client/ui/QuizDeckQuestionSkeleton.tsx";
import { QuizDeckResultToast } from "#client/ui/QuizDeckResultToast.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { View } from "#client/ui/View.tsx";
import { Rating } from "#util/fsrs.ts";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

vi.mock(`#client/ui/Icon.tsx`, () => ({ Icon: () => null }));
vi.mock(`#client/ui/DropdownMenu2.tsx`, () => ({
  DropdownMenu2: () => null,
}));
vi.mock(`#client/ui/SkillAnswerText.tsx`, () => ({
  SkillAnswerText: () => `Correct answer`,
}));
vi.mock(`#client/ui/RectButton.tsx`, () => ({ RectButton: () => null }));
vi.mock(`#client/ui/QuizSubmitButton.tsx`, () => ({
  QuizSubmitButton: () => <button type="button">Continue</button>,
}));
vi.mock(`#client/ui/Suspense.tsx`, async () => ({
  Suspense: (await import(`react`)).Suspense,
}));

test.for([Rating.Easy, Rating.Good, Rating.Hard, Rating.Again])(
  `rating %s stays anchored without reflow or replay on question exit`,
  async (rating) => {
    const screen = (graded: boolean) => (
      <Theme theme="light">
        <SafeAreaInsetsContext.Provider
          value={{ top: 0, right: 0, bottom: 34, left: 0 }}
        >
          <View testID="quiz" style={{ width: 390, height: 500 }}>
            <QuizDeckQuestionSkeleton
              skill="hp:test:meaning"
              grade={graded ? { rating } : undefined}
              isUserAnswerProvided
              onSubmit={() => {}}
              onRepeatQuestion={() => {}}
              showIdkButton
            >
              <View testID="question" className="flex-1 justify-center">
                <input aria-label="Answer" />
              </View>
            </QuizDeckQuestionSkeleton>
          </View>
        </SafeAreaInsetsContext.Provider>
      </Theme>
    );

    const result = await render(screen(false));
    await expect.element(page.getByTestId(`quiz`)).toBeInTheDocument();
    const quiz = page.getByTestId(`quiz`).element();
    const question = page.getByTestId(`question`).element();
    const initialHeight = question.getBoundingClientRect().height;
    await result.rerender(screen(true));
    await expect
      .poll(() => quiz.getAnimations({ subtree: true }).length)
      .toBe(1);

    const animation = quiz.getAnimations({ subtree: true })[0];
    if (animation == null) {
      throw new Error(`Expected a CSS enter animation`);
    }
    animation.pause();
    const animated = animation.effect;
    expect(animated).toBeInstanceOf(KeyframeEffect);
    if (!(animated instanceof KeyframeEffect)) {
      throw new Error(`Expected a CSS keyframe animation`);
    }
    const toast = animated.target;
    if (!(toast instanceof HTMLElement)) {
      throw new Error(`Expected an HTML toast`);
    }

    for (const height of [500, 740, 420, 740]) {
      quiz.style.height = `${height}px`;
      for (const time of [0, 75, 150, 300]) {
        animation.currentTime = time;
        expect(question.getBoundingClientRect().height).toBe(
          initialHeight + height - 500,
        );
        expect(toast.parentElement?.getBoundingClientRect().bottom).toBe(
          quiz.getBoundingClientRect().bottom,
        );
      }
    }

    animation.finish();
    await animation.finished;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    expect(toast.getBoundingClientRect().bottom).toBe(
      quiz.getBoundingClientRect().bottom,
    );
    expect(question.getBoundingClientRect().height).toBe(initialHeight + 240);
    expect(quiz.getBoundingClientRect().bottom).toBeGreaterThan(
      page
        .getByRole(`button`, { name: `Continue` })
        .element()
        .getBoundingClientRect().bottom,
    );

    // Reanimated moves the outgoing question's children into an exit-animation container.
    const outgoing = quiz.firstElementChild;
    if (!(outgoing instanceof HTMLElement)) {
      throw new Error(`Expected a question container`);
    }
    const exiting = outgoing.cloneNode();
    if (!(exiting instanceof HTMLElement)) {
      throw new Error(`Expected an exit-animation container`);
    }
    quiz.append(exiting);
    while (outgoing.firstChild != null) {
      exiting.append(outgoing.firstChild);
    }
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    expect(toast.getAnimations()).toHaveLength(0);
    expect(getComputedStyle(toast).transform).toBe(`none`);

    exiting.remove();
    await result.unmount();
    await render(screen(true));
    await expect.element(page.getByTestId(`quiz`)).toBeInTheDocument();
    await expect
      .poll(
        () =>
          page.getByTestId(`quiz`).element().getAnimations({ subtree: true })
            .length,
      )
      .toBe(1);
  },
);

test(`advancing before the enter animation finishes prevents replay on exit`, async () => {
  const screen = (visible: boolean) => (
    <Theme theme="light">
      <View testID="stage" style={{ width: 390, height: 740 }}>
        {visible ? (
          <QuizDeckResultToast
            skill="hp:test:meaning"
            rating={Rating.Good}
            onRepeatQuestion={() => {}}
          />
        ) : null}
      </View>
    </Theme>
  );
  const result = await render(screen(true));
  await expect.element(page.getByTestId(`stage`)).toBeInTheDocument();
  const stage = page.getByTestId(`stage`).element();
  await expect
    .poll(() => stage.getAnimations({ subtree: true }).length)
    .toBe(1);
  const animation = stage.getAnimations({ subtree: true })[0];
  if (animation == null || !(animation.effect instanceof KeyframeEffect)) {
    throw new Error(`Expected a CSS enter animation`);
  }
  animation.pause();
  animation.currentTime = 75;
  const toast = animation.effect.target;
  const overlay = toast?.parentElement;
  if (!(toast instanceof HTMLElement) || overlay == null) {
    throw new Error(`Expected a toast overlay`);
  }

  await result.rerender(screen(false));
  await expect.poll(() => stage.childElementCount).toBe(0);
  stage.append(overlay);
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  expect(toast.getAnimations()).toHaveLength(0);
  expect(getComputedStyle(toast).transform).toBe(`none`);
});
