import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu";
import * as React from "react";
import { Text } from "./Text";
import {
  Platform,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { FadeIn, ReduceMotion } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";
import { cn } from "tailwind-variants";
import { Icon } from "./Icon";
import { IconName } from "./iconRegistry";
import { NativeOnlyAnimatedView } from "./NativeOnlyAnimatedView";
import { PropsOf } from "@pinyinly/lib/types";

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  children?: React.ReactNode;
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
          group-active:text-accent-foreground

          text-sm select-none
        `,
        open && `text-accent-foreground`,
      )}
    >
      <DropdownMenuPrimitive.SubTrigger
        className={cn(
          `
            active:bg-accent

            group flex flex-row items-center justify-between rounded-sm p-2

            sm:py-1.5
          `,
          Platform.select({
            web: `focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none`,
          }),
          className,
          open && `bg-accent`,
          inset && `pl-8`,
        )}
        {...props}
      >
        <>{children}</>
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

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.reduceMotion(ReduceMotion.System)}>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          `bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5`,
          Platform.select({
            web: `animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]`,
          }),
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
  portalHost,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
}) {
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitive.Overlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  overlayStyle as typeof StyleSheet.absoluteFill,
                ])
              : StyleSheet.absoluteFill,
          })}
          className={overlayClassName}
          asChild={Platform.OS !== `web`}
        >
          <NativeOnlyAnimatedView
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            as="Pressable"
          >
            <Text.ClassContext.Provider value="text-popover-foreground">
              <DropdownMenuPrimitive.Content
                className={cn(
                  `
                    bg-popover border-border min-w-[8rem] overflow-hidden rounded-md border p-1
                    shadow-lg shadow-black/5
                  `,
                  Platform.select({
                    web: cn(
                      `
                        animate-in fade-in-0 zoom-in-95 z-50
                        max-h-(--radix-context-menu-content-available-height)
                        origin-(--radix-context-menu-content-transform-origin) cursor-default
                      `,
                      props.side === `bottom` && `slide-in-from-top-2`,
                      props.side === `top` && `slide-in-from-bottom-2`,
                    ),
                  }),
                  className,
                )}
                {...props}
              />
            </Text.ClassContext.Provider>
          </NativeOnlyAnimatedView>
        </DropdownMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </DropdownMenuPrimitive.Portal>
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
          text-popover-foreground

          group-active:text-popover-foreground

          text-sm select-none
        `,
        variant === `destructive` &&
          `
            text-destructive

            group-active:text-destructive
          `,
      )}
    >
      <DropdownMenuPrimitive.Item
        className={cn(
          `
            active:bg-accent

            group relative flex flex-row items-center gap-2 rounded-sm p-2

            sm:py-1.5
          `,
          Platform.select({
            web: cn(
              `
                focus:bg-accent focus:text-accent-foreground

                cursor-default outline-none

                data-[disabled]:pointer-events-none
              `,
              variant === `destructive` &&
                `
                  focus:bg-destructive/10

                  dark:focus:bg-destructive/20
                `,
            ),
          }),
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
    <Text.ClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        className={cn(
          `
            active:bg-accent

            group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8

            sm:py-1.5
          `,
          Platform.select({
            web: `focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none`,
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
        <>{children}</>
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
    <Text.ClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.RadioItem
        className={cn(
          `
            active:bg-accent

            group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8

            sm:py-1.5
          `,
          Platform.select({
            web: `focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none`,
          }),
          props.disabled && `opacity-50`,
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <View className="bg-foreground size-2 rounded-full" />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.RadioItem>
    </Text.ClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        `
          text-foreground p-2 text-sm font-medium

          sm:py-1.5
        `,
        inset && `pl-8`,
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
      className={cn(`bg-border -mx-1 my-1 h-px`, className)}
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
      className={cn(
        `text-muted-foreground ml-auto text-xs tracking-widest`,
        className,
      )}
      {...props}
    />
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
