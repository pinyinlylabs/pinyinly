import type { PropsOf } from "@pinyinly/lib/types";
import type { TypedNavigator } from "@react-navigation/native";
import type { AnyFunction } from "ts-essentials";

export type StackNavigationFor<
  Stack,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScreenListenersFn = Stack extends TypedNavigator<any, any>
    ? PropsOf<Stack[`Navigator`]>[`screenListeners`]
    : never,
> = ScreenListenersFn extends AnyFunction
  ? Parameters<ScreenListenersFn>[0][`navigation`]
  : never;
