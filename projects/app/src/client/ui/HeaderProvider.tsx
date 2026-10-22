import { HeaderContext } from "@/client/ui/contexts";
import type { HeaderTitleScrollTriggerState } from "@/client/ui/contexts";
import { maxK } from "@pinyinly/lib/collections";
import { useIsFocused } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import { use, useId, useLayoutEffect, useState } from "react";
import type { TextProps } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { tv } from "tailwind-variants";

function useHeaderContextOrThrow() {
  const context = use(HeaderContext);
  if (context == null) {
    throw new Error(
      `HeaderProvider compound components must be used within a HeaderProvider`,
    );
  }
  return context;
}

function HeaderProvider({
  children,
  actionsSlotEnabled = false,
}: PropsWithChildren<{ actionsSlotEnabled?: boolean }>) {
  const [titleScrollTriggerStates, setTitleScrollTriggerStates] = useState<
    readonly HeaderTitleScrollTriggerState[]
  >([]);
  const [defaultTitle, setDefaultTitle] = useState<string | null>(null);
  const [actionsSlotContent, setActionsSlotContent] = useState<ReactNode>(null);

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
    <HeaderContext.Provider
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
        actionsSlotEnabled,
        actionsSlotContent,
        setActionsSlotContent,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

function HeaderProviderScrollTrigger({ title }: { title: string }) {
  const { removeTitleScrollTriggerState, upsertTitleScrollTriggerState } =
    useHeaderContextOrThrow();
  const id = useId();
  const [element, setElement] = useState<Element | null>(null);
  const isFocused = useIsFocused();

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

function HeaderProviderTitleText({
  className,
}: {
  className?: TextProps[`className`];
}) {
  const { title, showTitle } = useHeaderContextOrThrow();

  if (title == null) {
    return null;
  }

  return (
    <Text className={titleTextClass({ className, show: showTitle })}>
      {title}
    </Text>
  );
}

function HeaderProviderDefaultTitle({ title }: { title: string }) {
  const { setDefaultTitle } = useHeaderContextOrThrow();

  useLayoutEffect(() => {
    setDefaultTitle(title);
    return () => {
      setDefaultTitle(null);
    };
  }, [title, setDefaultTitle]);

  return null;
}

function HeaderProviderActionsPortal({ children }: PropsWithChildren) {
  const context = use(HeaderContext);
  const actionsSlotEnabled = context?.actionsSlotEnabled ?? false;
  const setActionsSlotContent = context?.setActionsSlotContent;

  useLayoutEffect(() => {
    if (!actionsSlotEnabled || setActionsSlotContent == null) {
      return;
    }

    setActionsSlotContent(children);
    return () => {
      setActionsSlotContent(null);
    };
  }, [actionsSlotEnabled, children, setActionsSlotContent]);

  return actionsSlotEnabled ? null : <>{children}</>;
}

function HeaderProviderActionsSlot() {
  const { actionsSlotContent } = useHeaderContextOrThrow();
  return <>{actionsSlotContent}</>;
}

HeaderProvider.TitleText = HeaderProviderTitleText;
HeaderProvider.ScrollTrigger = HeaderProviderScrollTrigger;
HeaderProvider.DefaultTitle = HeaderProviderDefaultTitle;
HeaderProvider.ActionsPortal = HeaderProviderActionsPortal;
HeaderProvider.ActionsSlot = HeaderProviderActionsSlot;

export { HeaderProvider };

const titleTextClass = tv({
  base: `transition-opacity`,
  variants: {
    show: {
      true: `opacity-100`,
      false: `opacity-0`,
    },
  },
});
