import { MenuHeaderContext } from "@/client/ui/contexts";
import type { MenuHeaderTitleScrollTriggerState } from "@/client/ui/contexts";
import { maxK } from "@pinyinly/lib/collections";
import { NavigationContext } from "@react-navigation/native";
import type { PropsWithChildren } from "react";
import { use, useEffect, useId, useLayoutEffect, useState } from "react";
import type { TextProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

function useMenuContextOrThrow() {
  const context = use(MenuHeaderContext);
  if (context == null) {
    throw new Error(
      `MenuContext compound components must be used within a MenuContext`,
    );
  }
  return context;
}

function MenuContextRoot({ children }: PropsWithChildren) {
  const [titleScrollTriggerStates, setTitleScrollTriggerStates] = useState<
    readonly MenuHeaderTitleScrollTriggerState[]
  >([]);

  const activeTitleScrollTriggerState = maxK(
    titleScrollTriggerStates.filter(
      (state) => state.top != null && state.top <= 0,
    ),
    1,
    (state) => state.top ?? Number.NEGATIVE_INFINITY,
  )[0];

  const title = activeTitleScrollTriggerState?.title ?? null;
  const showTitle = activeTitleScrollTriggerState != null;

  return (
    <MenuHeaderContext.Provider
      value={{
        title,
        showTitle,
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
    </MenuHeaderContext.Provider>
  );
}

function MenuContextTitleScrollTrigger({ title }: { title: string }) {
  const { removeTitleScrollTriggerState, upsertTitleScrollTriggerState } =
    useMenuContextOrThrow();
  const navigation = use(NavigationContext);
  const id = useId();
  const [element, setElement] = useState<Element | null>(null);
  const [isFocused, setIsFocused] = useState(
    () => navigation?.isFocused() ?? true,
  );

  useEffect(() => {
    if (navigation == null) {
      return;
    }

    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setIsFocused(navigation.isFocused());

    const unsubscribeFocus = navigation.addListener(`focus`, () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener(`blur`, () => {
      setIsFocused(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
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
    if (
      (overflowY === `auto` || overflowY === `scroll`) &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function MenuContextTitleText({
  className,
}: {
  className?: TextProps[`className`];
}) {
  const { title, showTitle } = useMenuContextOrThrow();

  if (title == null) {
    return null;
  }

  return (
    <Text className={titleTextClass({ className, show: showTitle })}>
      {title}
    </Text>
  );
}

export const MenuContext = Object.assign(MenuContextRoot, {
  TitleText: MenuContextTitleText,
  TitleScrollTrigger: MenuContextTitleScrollTrigger,
});

const titleTextClass = tv({
  base: `transition-opacity`,
  variants: {
    show: {
      true: `opacity-100`,
      false: `opacity-0`,
    },
  },
});
