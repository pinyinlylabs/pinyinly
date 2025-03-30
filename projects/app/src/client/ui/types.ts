import type { TypedNavigator } from "@react-navigation/native";
import type React from "react";
import type { AnyFunction } from "ts-essentials";

export type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

export type StackNavigationFor<
  Stack,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScreenListenersFn = Stack extends TypedNavigator<any, any>
    ? PropsOf<Stack[`Navigator`]>[`screenListeners`]
    : never,
> = ScreenListenersFn extends AnyFunction
  ? Parameters<ScreenListenersFn>[0][`navigation`]
  : never;
