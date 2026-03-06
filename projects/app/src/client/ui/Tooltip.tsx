import { mergeProps } from "@/client/react";
import { hapticImpactIfMobile } from "@/client/ui/hooks/hapticImpactIfMobile";
import { usePointerHoverCapability } from "@/client/ui/hooks/usePointerHoverCapability";
import type { TooltipProviderContextValue } from "@/client/ui/TooltipProvider";
import { TooltipProvider } from "@/client/ui/TooltipProvider";
import type { Placement } from "@floating-ui/react-native";
import { flip, offset, shift, useFloating } from "@floating-ui/react-native";
import type { PropsOf } from "@pinyinly/lib/types";
import type { ReactElement, ReactNode } from "react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  use,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, View } from "react-native";
import { tv } from "tailwind-variants";
import { Portal } from "./Portal";

interface TooltipContextValue {
  isOpen: boolean;
  openWithDelay: () => void;
  close: () => void;
  toggleWithTouch: () => void;
  contentId: string;
  setReference: ReturnType<typeof useFloating>[`refs`][`setReference`];
  setFloating: ReturnType<typeof useFloating>[`refs`][`setFloating`];
  floatingStyles: ReturnType<typeof useFloating>[`floatingStyles`];
  isInitializingPosition: boolean;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = use(TooltipContext);
  if (context == null) {
    throw new Error(
      `Tooltip compound components must be used within a Tooltip`,
    );
  }
  return context;
}

const fallbackTooltipProvider: TooltipProviderContextValue = {
  getOpenDelayDuration: () => TooltipProvider.defaultDelayDuration,
  onTooltipOpen: () => {
    // no-op fallback when TooltipProvider is omitted
  },
  onTooltipClose: () => {
    // no-op fallback when TooltipProvider is omitted
  },
};

export interface TooltipProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  placement?: Placement;
  sideOffset?: number;
}

function TooltipRoot({
  children,
  defaultOpen = false,
  placement = `top`,
  sideOffset = 8,
}: TooltipProps) {
  const providerContext: TooltipProviderContextValue =
    use(TooltipProvider.Context) ?? fallbackTooltipProvider;
  const isPointerHoverCapable = usePointerHoverCapability();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    placement,
    sameScrollView: false,
    middleware: [
      shift({ padding: sideOffset }),
      flip({ padding: sideOffset }),
      offset(sideOffset),
    ],
  });

  useEffect(() => {
    return () => {
      if (openTimerRef.current != null) {
        clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  const clearOpenTimer = () => {
    if (openTimerRef.current != null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const close = () => {
    clearOpenTimer();
    setIsOpen(false);
    providerContext.onTooltipClose();
  };

  const openWithDelay = () => {
    clearOpenTimer();

    const delay = providerContext.getOpenDelayDuration();
    if (delay === 0) {
      setIsOpen(true);
      providerContext.onTooltipOpen();
      return;
    }

    openTimerRef.current = setTimeout(() => {
      setIsOpen(true);
      providerContext.onTooltipOpen();
      openTimerRef.current = null;
    }, delay);
  };

  const toggleWithTouch = () => {
    if (isPointerHoverCapable) {
      return;
    }

    hapticImpactIfMobile();
    if (isOpen) {
      close();
    } else {
      clearOpenTimer();
      setIsOpen(true);
      providerContext.onTooltipOpen();
    }
  };

  const isInitializingPosition =
    floatingStyles.left === 0 && floatingStyles.top === 0;

  return (
    <TooltipContext.Provider
      value={{
        isOpen,
        openWithDelay,
        close,
        toggleWithTouch,
        contentId,
        setReference,
        setFloating,
        floatingStyles,
        isInitializingPosition,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps {
  asChild?: boolean;
  children?: ReactNode;
  className?: string;
}

export type TooltipTriggerFullProps = TooltipTriggerProps &
  Omit<PropsOf<typeof Pressable>, `children`>;

function TooltipTrigger({
  asChild = false,
  children,
  className,
  ...pressableProps
}: TooltipTriggerFullProps) {
  const { openWithDelay, close, toggleWithTouch, setReference } =
    useTooltipContext();

  const triggerProps: Omit<PropsOf<typeof Pressable>, `children`> = {
    ...pressableProps,
    ref: setReference,
    onHoverIn: (e) => {
      openWithDelay();
      pressableProps.onHoverIn?.(e);
    },
    onHoverOut: (e) => {
      close();
      pressableProps.onHoverOut?.(e);
    },
    onFocus: (e) => {
      openWithDelay();
      pressableProps.onFocus?.(e);
    },
    onBlur: (e) => {
      close();
      pressableProps.onBlur?.(e);
    },
    onPress: (e) => {
      toggleWithTouch();
      pressableProps.onPress?.(e);
    },
  };

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement(child)) {
      throw new Error(
        `Tooltip.Trigger with asChild expects a valid React element`,
      );
    }

    return cloneElement(
      child as ReactElement<Omit<PropsOf<typeof Pressable>, `children`>>,
      mergeProps(
        (child as ReactElement<Omit<PropsOf<typeof Pressable>, `children`>>)
          .props,
        triggerProps,
      ),
    );
  }

  return (
    <Pressable {...triggerProps} className={className}>
      {children}
    </Pressable>
  );
}

export interface TooltipContentProps {
  children?: ReactNode;
  className?: string;
}

function TooltipContent({ children, className }: TooltipContentProps) {
  const {
    isOpen,
    contentId,
    setFloating,
    floatingStyles,
    isInitializingPosition,
  } = useTooltipContext();

  if (!isOpen) {
    return null;
  }

  const content = (
    <View
      ref={setFloating}
      collapsable={false}
      style={floatingStyles}
      nativeID={contentId}
      className={tooltipContentClass({
        isInitializingPosition,
        className,
      })}
    >
      {children}
    </View>
  );

  return Platform.OS === `web` ? <Portal>{content}</Portal> : content;
}

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});

const tooltipContentClass = tv({
  base: `shadow-lg max-w-[320px] rounded-md border border-fg/15 bg-bg-high px-3 py-2`,
  variants: {
    isInitializingPosition: {
      true: `invisible`,
      false: `visible`,
    },
  },
});
