import type { FunctionComponent, ReactElement, ReactNode, Ref } from "react";
import { Children, isValidElement } from "react";
import type { PropsOf } from "./ui/types";

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): Ref<T> {
  return (value) => {
    const cleanups: (() => void)[] = [];

    for (const ref of refs) {
      if (typeof ref === `function`) {
        const cleanup = ref(value);
        if (typeof cleanup === `function`) {
          cleanups.push(cleanup);
        } else {
          cleanups.push(() => ref(null));
        }
      } else if (ref) {
        ref.current = value;
        cleanups.push(() => (ref.current = null));
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };
}

export function reactInvariant<P>(
  component: FunctionComponent<P>,
  invariantFn: (props: P) => void,
): typeof component {
  return Object.assign(
    (props: P) => {
      invariantFn(props);
      return component(props);
    },
    { displayName: component.displayName },
  ) as typeof component;
}

export function pickChildren<
  T1 extends FunctionComponent,
  T2 extends FunctionComponent,
  T3 extends FunctionComponent,
>(children: ReactNode, type1: T1, type2?: T2, type3?: T3) {
  const picked: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      switch (child.type) {
        case type1: {
          picked[0] = child;
          break;
        }
        case type2: {
          picked[1] = child;
          break;
        }
        case type3: {
          picked[2] = child;
          break;
        }
        // No default
      }
    }
  });

  return picked as [
    ReactElement<PropsOf<typeof type1>> | undefined,
    ReactElement<PropsOf<typeof type2>> | undefined,
    ReactElement<PropsOf<typeof type3>> | undefined,
  ];
}
