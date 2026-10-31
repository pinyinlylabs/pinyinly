// oxlint-disable import/namespace -- See https://github.com/oxc-project/oxc/issues/13258#issuecomment-4582968867
import * as SelectPrimitive from "@rn-primitives/select";
import { hapticImpactIfMobile } from "@/client/ui/hooks/hapticImpactIfMobile";
import { Icon } from "@/client/ui/Icon";
import { NativeOnlyAnimatedView } from "@/client/ui/NativeOnlyAnimatedView";
import { Text } from "@/client/ui/Text";
import { Theme } from "@/client/ui/Theme";
import { View } from "@/client/ui/View";
import { cn } from "tailwind-variants";
import { ScopedTheme, useUniwind } from "uniwind";
import { Fragment } from "react";
import type { PropsWithChildren } from "react";
import { Platform, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

export interface SelectOption<Value extends string = string> {
  value: Value;
  label: string;
}

export interface SelectProps<Value extends string> {
  options: readonly SelectOption<Value>[];
  value?: Value;
  onValueChange: (value: Value) => void;
  placeholder: string;
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
}

export function Select<Value extends string>({
  options,
  value,
  onValueChange,
  placeholder,
  accessibilityLabel,
  disabled,
  className,
}: SelectProps<Value>) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <SelectPrimitive.Root
      value={selectedOption}
      disabled={disabled}
      onValueChange={(option) => {
        if (option == null) {
          return;
        }
        const selected = options.find(
          (candidate) => candidate.value === option.value,
        );
        if (selected == null) {
          throw new Error(`Unknown Select option "${option.value}"`);
        }
        onValueChange(selected.value);
      }}
    >
      <SelectPrimitive.Trigger
        accessibilityLabel={accessibilityLabel}
        className={cn(
          `
            h-10 min-w-40 flex-row items-center justify-between gap-2 rounded-xl border border-fg/20
            bg-bg px-3 py-2

            hover:bg-fg/10

            web:cursor-pointer web:transition-colors web:outline-none

            web:focus-visible:outline-3 web:focus-visible:outline-offset-2
            web:focus-visible:outline-blue/50

            web:data-[state=open]:bg-fg/10
          `,
          disabled && `opacity-50`,
          className,
        )}
        disabled={disabled}
        onPressIn={hapticImpactIfMobile}
      >
        <SelectPrimitive.Value
          className="font-sans text-sm font-semibold text-fg"
          placeholder={placeholder}
        />
        <SelectTriggerChevron />
      </SelectPrimitive.Trigger>
      <Theme theme="default">
        <SelectPortal>
          <FullWindowOverlay>
            <SelectPrimitive.Overlay
              style={Platform.select<StyleProp<ViewStyle>>({
                web: undefined,
                native: StyleSheet.absoluteFill,
              })}
              className="web:fixed web:inset-0 web:z-40"
              asChild={Platform.OS !== `web`}
            >
              <NativeOnlyAnimatedView
                as="Pressable"
                className="flex-1 bg-bg/50"
              >
                <Theme theme="popover">
                  <Text.ClassContext.Provider value="text-fg">
                    <SelectPrimitive.Content
                      className={`
                        min-w-40 rounded-xl bg-bg-high p-2

                        web:z-50 web:max-h-60 web:cursor-default web:bg-bg-high/80 web:shadow-lg
                        web:backdrop-blur-md web:animate-in web:fade-in-0 web:zoom-in-95
                      `}
                      sideOffset={4}
                    >
                      <SelectPrimitive.Viewport className="gap-1">
                        {options.map((option) => (
                          <SelectPrimitive.Item
                            key={option.value}
                            value={option.value}
                            label={option.label}
                            className={`
                              group relative min-h-10 flex-row items-center gap-2 rounded py-2 pr-2
                              pl-8

                              active:bg-accent

                              web:cursor-pointer web:outline-none

                              web:focus:bg-accent web:focus:text-accent-fg

                              web:data-[disabled]:pointer-events-none
                            `}
                          >
                            <View
                              className="
                                absolute top-0 bottom-0 left-2 flex w-4 items-center justify-center
                              "
                            >
                              <SelectPrimitive.ItemIndicator>
                                <Icon
                                  icon="check"
                                  tintColorClassName="accent-fg"
                                  size={16}
                                  className="web:pointer-events-none"
                                />
                              </SelectPrimitive.ItemIndicator>
                            </View>
                            <SelectPrimitive.ItemText className="font-sans text-sm font-semibold text-fg" />
                          </SelectPrimitive.Item>
                        ))}
                      </SelectPrimitive.Viewport>
                    </SelectPrimitive.Content>
                  </Text.ClassContext.Provider>
                </Theme>
              </NativeOnlyAnimatedView>
            </SelectPrimitive.Overlay>
          </FullWindowOverlay>
        </SelectPortal>
      </Theme>
    </SelectPrimitive.Root>
  );
}

function SelectTriggerChevron() {
  const { open } = SelectPrimitive.useRootContext();

  return (
    <View
      className={cn(
        `relative size-4 shrink-0 transition-transform`,
        open && `rotate-180`,
      )}
    >
      <Icon icon="chevron-down" size={16} />
    </View>
  );
}

function SelectPortal({ children }: PropsWithChildren) {
  const { theme } = useUniwind();

  return (
    <SelectPrimitive.Portal hostName="root">
      <ScopedTheme theme={theme}>{children}</ScopedTheme>
    </SelectPrimitive.Portal>
  );
}

const FullWindowOverlay =
  Platform.OS === `ios` ? RNFullWindowOverlay : Fragment;
