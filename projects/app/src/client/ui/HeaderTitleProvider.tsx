import { HeaderTitleContext } from "@/client/ui/contexts";
import type { HeaderTitleScrollTriggerState } from "@/client/ui/contexts";
import { useIsAppFocused } from "@/client/ui/hooks/useIsAppFocused";
import { maxK } from "@pinyinly/lib/collections";
import type { PropsWithChildren } from "react";
import { use, useId, useLayoutEffect, useState } from "react";
import type { TextProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

function useHeaderTitleContextOrThrow() {
  const context = use(HeaderTitleContext);
  if (context == null) {
    throw new Error(
      `HeaderTitleProvider compound components must be used within a HeaderTitleProvider`,
    );
  }
  return context;
}

function HeaderTitleProvider({ children }: PropsWithChildren) {
  const [titleScrollTriggerStates, setTitleScrollTriggerStates] = useState<
    readonly HeaderTitleScrollTriggerState[]
  >([]);
  const [defaultTitle, setDefaultTitle] = useState<string | null>(null);

  const activeTitleScrollTriggerState = maxK(
    titleScrollTriggerStates.filter(
      (state) => state.top != null && state.top <= 0,
    ),
    1,
    (state) => state.top ?? Number.NEGATIVE_INFINITY,
  )[0];

  const title = activeTitleScrollTriggerState?.title ?? defaultTitle;
  const showTitle =
    activeTitleScrollTriggerState != null || defaultTitle != null;

  return (
    <HeaderTitleContext.Provider
      value={{
        title,
        showTitle,
        defaultTitle,
        setDefaultTitle,
        upsertTitleScrollTriggerState: (state) => {
          setTitleScrollTriggerStates((current) => {
            const next = current.filter((item) => item.id !== state.id);
            return [...next, state];
          });
        },
        removeTitleScrollTriggerState: (id) => {
          setTitleScrollTriggerStates((current) =>
            current.filter((state) => state.id !== id),
          );
        },
      }}
    >
      {children}
    </HeaderTitleContext.Provider>
  );
}

function HeaderTitleProviderScrollTrigger({ title }: { title: string }) {
  const { removeTitleScrollTriggerState, upsertTitleScrollTriggerState } =
    useHeaderTitleContextOrThrow();
  const id = useId();
  const [element, setElement] = useState<Element | null>(null);
  const isFocused = useIsAppFocused();

  useLayoutEffect(() => {
    if (!isFocused) {
      removeTitleScrollTriggerState(id);
      return;
    }

    if (element == null || typeof window === `undefined`) {
      return;
    }

    const root = findNearestScrollContainer(element);
    let frame: number | null = null;

    const measure = () => {
      const top =
        root == null
          ? element.getBoundingClientRect().top
          : element.getBoundingClientRect().top -
            root.getBoundingClientRect().top;

      upsertTitleScrollTriggerState({
        id,
        title,
        top,
      });
    };

    const scheduleMeasure = () => {
      if (frame != null) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;
        measure();
      });
    };

    const scrollTarget = root ?? window;

    scheduleMeasure();
    scrollTarget.addEventListener(`scroll`, scheduleMeasure, {
      passive: true,
    });
    window.addEventListener(`resize`, scheduleMeasure);
    window.addEventListener(`focus`, scheduleMeasure);
    document.addEventListener(`visibilitychange`, scheduleMeasure);

    const resizeObserver =
      typeof ResizeObserver === `undefined`
        ? null
        : new ResizeObserver(() => {
            scheduleMeasure();
          });

    resizeObserver?.observe(element);
    if (root != null) {
      resizeObserver?.observe(root);
    }

    return () => {
      if (frame != null) {
        window.cancelAnimationFrame(frame);
      }

      scrollTarget.removeEventListener(`scroll`, scheduleMeasure);
      window.removeEventListener(`resize`, scheduleMeasure);
      window.removeEventListener(`focus`, scheduleMeasure);
      document.removeEventListener(`visibilitychange`, scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [
    element,
    id,
    isFocused,
    removeTitleScrollTriggerState,
    title,
    upsertTitleScrollTriggerState,
  ]);

  useLayoutEffect(() => {
    return () => {
      removeTitleScrollTriggerState(id);
    };
  }, [id, removeTitleScrollTriggerState]);

  return (
    <View
      className={`h-0 w-full`}
      ref={(element) => {
        setElement(element as Element | null);
      }}
    />
  );
}

function findNearestScrollContainer(element: Element): Element | null {
  let current = element.parentElement;
  while (current != null) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === `auto` || overflowY === `scroll`) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function HeaderTitleProviderTitleText({
  className,
}: {
  className?: TextProps[`className`];
}) {
  const { title, showTitle } = useHeaderTitleContextOrThrow();

  if (title == null) {
    return null;
  }

  return (
    <Text className={titleTextClass({ className, show: showTitle })}>
      {title}
    </Text>
  );
}

function HeaderTitleProviderDefaultTitle({ title }: { title: string }) {
  const { setDefaultTitle } = useHeaderTitleContextOrThrow();

  useLayoutEffect(() => {
    setDefaultTitle(title);
    return () => {
      setDefaultTitle(null);
    };
  }, [title, setDefaultTitle]);

  return null;
}

HeaderTitleProvider.TitleText = HeaderTitleProviderTitleText;
HeaderTitleProvider.ScrollTrigger = HeaderTitleProviderScrollTrigger;
HeaderTitleProvider.DefaultTitle = HeaderTitleProviderDefaultTitle;

export { HeaderTitleProvider };

const titleTextClass = tv({
  base: `transition-opacity`,
  variants: {
    show: {
      true: `opacity-100`,
      false: `opacity-0`,
    },
  },
});
