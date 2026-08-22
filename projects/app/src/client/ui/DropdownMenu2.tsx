// oxlint-disable import/namespace -- See https://github.com/oxc-project/oxc/issues/13258#issuecomment-4582968867
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu";
import { Text } from "./Text";
import { Platform, Pressable, StyleSheet } from "react-native";
import { View } from "@/client/ui/View";
import type { StyleProp, ViewStyle } from "react-native";
import { FadeIn, ReduceMotion } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import { cn } from "tailwind-variants";
import { Icon } from "./Icon";
import type { IconName } from "./iconRegistry";
import { NativeOnlyAnimatedView } from "./NativeOnlyAnimatedView";
import type { PropsOf } from "@pinyinly/lib/types";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import React from "react";
import { Portal } from "./Portal";
import { Theme } from "./Theme";
import { Slot } from "@rn-primitives/slot";
import { useAccessibilityFocus, useComposedRefs } from "@rn-primitives/hooks";
import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  children?: ReactNode;
  iconClassName?: string;
  inset?: boolean;
}) {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const icon: IconName =
    Platform.OS === `web`
      ? `chevron-right`
      : open
        ? `chevron-up`
        : `chevron-down`;
  return (
    <Text.ClassContext.Provider
      value={cn(
        `
          text-sm select-none

          group-active:text-accent-fg
        `,
        open && `text-accent-fg`,
      )}
    >
      <DropdownMenuPrimitive.SubTrigger
        className={cn(
          `
            group flex flex-row items-center justify-between rounded-sm p-2

            active:bg-accent

            sm:py-1.5

            web:cursor-default web:outline-none

            web:focus:bg-accent web:focus:text-accent-fg

            web:[&_svg]:pointer-events-none
          `,
          className,
          open && `bg-accent`,
          inset && `pl-8`,
        )}
        {...props}
      >
        {children}
        <Icon
          icon={icon}
          tintColorClassName="accent-fg"
          size={16}
          className={cn(`shrink-0`, iconClassName)}
        />
      </DropdownMenuPrimitive.SubTrigger>
    </Text.ClassContext.Provider>
  );
}

type SubContentComponentProps = PropsOf<
  typeof DropdownMenuPrimitive.SubContent
>;

function SubContentWeb({
  asChild = false,
  forceMount,
  ref,
  ...props
}: SubContentComponentProps) {
  const Component = asChild ? Slot : Pressable;
  return (
    <Portal>
      <RadixDropdownMenu.SubContent forceMount={forceMount}>
        <Component ref={ref} {...props} />
      </RadixDropdownMenu.SubContent>
    </Portal>
  );
}

function SubContentNative({
  asChild = false,
  forceMount,
  ref,
  ...props
}: SubContentComponentProps) {
  const { open, onOpenChange } = DropdownMenuPrimitive.useSubContext();
  const accessibilityFocusRef = useAccessibilityFocus(open);
  const composedRef = useComposedRefs(ref, accessibilityFocusRef);
  if (!forceMount && !open) {
    return null;
  }
  const Component = asChild ? Slot : Pressable;
  return (
    <Component
      ref={composedRef}
      accessible={false}
      role="menu"
      onAccessibilityEscape={() => {
        onOpenChange(false);
      }}
      {...props}
    />
  );
}

const SubContent: React.ComponentType<SubContentComponentProps> =
  Platform.select({
    web: SubContentWeb,
    default: SubContentNative,
  });

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.reduceMotion(ReduceMotion.System)}>
      <SubContent
        className={cn(
          `
            overflow-hidden rounded-md border border-border bg-bg p-1 shadow-lg shadow-black/5
            animate-in

            web:z-50 web:min-w-[8rem] web:origin-(--radix-context-menu-content-transform-origin)
            web:animate-in web:fade-in-0 web:zoom-in-95

            web:data-[side=bottom]:slide-in-from-top-2

            web:data-[side=left]:slide-in-from-right-2

            web:data-[side=right]:slide-in-from-left-2

            web:data-[side=top]:slide-in-from-bottom-2

            web:data-[state=closed]:animate-out web:data-[state=closed]:fade-out-0
            web:data-[state=closed]:zoom-out-95
          `,
          className,
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

const FullWindowOverlay =
  Platform.OS === `ios` ? RNFullWindowOverlay : React.Fragment;

function DropdownMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
}) {
  return (
    <Theme theme="popover">
      <DropdownPortal>
        <FullWindowOverlay>
          <DropdownMenuPrimitive.Overlay
            style={Platform.select<StyleProp<ViewStyle>>({
              web: overlayStyle ?? undefined,
              native:
                overlayStyle == null
                  ? (StyleSheet.absoluteFill as ViewStyle)
                  : StyleSheet.flatten([
                      StyleSheet.absoluteFill as ViewStyle,
                      overlayStyle as ViewStyle,
                    ]),
            })}
            className={overlayClassName}
            asChild={Platform.OS !== `web`}
          >
            <NativeOnlyAnimatedView
              entering={FadeIn.reduceMotion(ReduceMotion.System)}
              as="Pressable"
            >
              <Text.ClassContext.Provider value="text-fg">
                <DropdownMenuPrimitive.Content
                  className={cn(
                    `
                      min-w-[8rem] overflow-hidden rounded-md border border-border bg-bg p-1
                      shadow-lg shadow-black/5

                      web:z-50 web:max-h-(--radix-context-menu-content-available-height)
                      web:origin-(--radix-context-menu-content-transform-origin) web:cursor-default
                      web:animate-in web:fade-in-0 web:zoom-in-95
                    `,
                    props.side === `bottom` && `web:slide-in-from-top-2`,
                    props.side === `top` && `web:slide-in-from-bottom-2`,
                    className,
                  )}
                  {...props}
                />
              </Text.ClassContext.Provider>
            </NativeOnlyAnimatedView>
          </DropdownMenuPrimitive.Overlay>
        </FullWindowOverlay>
      </DropdownPortal>
    </Theme>
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  variant?: `default` | `destructive`;
}) {
  return (
    <Text.ClassContext.Provider
      value={cn(
        `
          text-sm text-fg select-none

          group-active:text-fg
        `,
        variant === `destructive` &&
          `
            text-destructive-fg

            group-active:text-destructive-fg
          `,
      )}
    >
      <DropdownMenuPrimitive.Item
        className={cn(
          `
            group relative flex flex-row items-center gap-2 rounded-sm p-2

            active:bg-accent

            sm:py-1.5

            web:cursor-default web:outline-none

            web:focus:bg-accent web:focus:text-accent-fg

            web:data-[disabled]:pointer-events-none
          `,
          variant === `destructive` &&
            `
              web:focus:bg-destructive/10

              web:dark:focus:bg-destructive/20
            `,

          variant === `destructive` &&
            `
              active:bg-destructive/10

              dark:active:bg-destructive/20
            `,
          props.disabled && `opacity-50`,
          inset && `pl-8`,
          className,
        )}
        {...props}
      />
    </Text.ClassContext.Provider>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  children?: React.ReactNode;
}) {
  return (
    <Text.ClassContext.Provider value="text-sm text-fg select-none group-active:text-accent-fg">
      <DropdownMenuPrimitive.CheckboxItem
        className={cn(
          `
            group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8

            active:bg-accent

            sm:py-1.5
          `,
          Platform.select({
            web: `focus:accent focus:text-accent-fg cursor-default outline-none data-[disabled]:pointer-events-none`,
          }),
          props.disabled && `opacity-50`,
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Icon
              icon="check"
              tintColorClassName="accent-fg"
              size={16}
              className={Platform.select({ web: `pointer-events-none` })}
            />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        {children}
      </DropdownMenuPrimitive.CheckboxItem>
    </Text.ClassContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  children?: React.ReactNode;
}) {
  return (
    <Text.ClassContext.Provider value="text-sm text-fg select-none group-active:text-accent-fg">
      <DropdownMenuPrimitive.RadioItem
        className={cn(
          `
            group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8

            active:bg-accent

            sm:py-1.5
          `,
          Platform.select({
            web: `focus:accent focus:text-accent-fg cursor-default outline-none data-[disabled]:pointer-events-none`,
          }),
          props.disabled && `opacity-50`,
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <View className="size-2 rounded-full bg-fg" />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        {children}
      </DropdownMenuPrimitive.RadioItem>
    </Text.ClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        `
          p-2 text-sm font-medium text-fg

          sm:py-1.5
        `,
        inset ? `pl-8` : null,
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn(`-mx-1 my-1 h-px bg-border`, className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn(`ml-auto text-xs tracking-widest text-muted-fg`, className)}
      {...props}
    />
  );
}

function DropdownPortal({ children }: PropsWithChildren) {
  const value = DropdownMenuPrimitive.useRootContext();
  // if (!value.triggerPosition) {
  //   return null;
  // }
  return (
    <Portal>
      <DropdownMenuPrimitive.RootContext.Provider value={value}>
        {children}
      </DropdownMenuPrimitive.RootContext.Provider>
    </Portal>
  );
}

export function DropdownMenu2(
  props: PropsOf<typeof DropdownMenuPrimitive.Root>,
) {
  return <DropdownMenuPrimitive.Root {...props} />;
}

DropdownMenu2.Trigger = DropdownMenuPrimitive.Trigger;
DropdownMenu2.CheckboxItem = DropdownMenuCheckboxItem;
DropdownMenu2.Content = DropdownMenuContent;
DropdownMenu2.Group = DropdownMenuPrimitive.Group;
DropdownMenu2.Item = DropdownMenuItem;
DropdownMenu2.Label = DropdownMenuLabel;
DropdownMenu2.Portal = DropdownMenuPrimitive.Portal;
DropdownMenu2.RadioGroup = DropdownMenuPrimitive.RadioGroup;
DropdownMenu2.RadioItem = DropdownMenuRadioItem;
DropdownMenu2.Separator = DropdownMenuSeparator;
DropdownMenu2.Shortcut = DropdownMenuShortcut;
DropdownMenu2.Sub = DropdownMenuPrimitive.Sub;
DropdownMenu2.SubContent = DropdownMenuSubContent;
DropdownMenu2.SubTrigger = DropdownMenuSubTrigger;
