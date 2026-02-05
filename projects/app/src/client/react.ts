import type { PropsOf } from "@pinyinly/lib/types";
import type {
  FunctionComponent,
  ReactElement,
  ReactNode,
  Ref,
  RefCallback,
} from "react";
import { Children, cloneElement, isValidElement } from "react";

/**
 * Merges multiple refs into a single ref callback that updates all of them.
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
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
        default: {
          // No default
          return;
        }
      }
    }
  });

  return picked as [
    ReactElement<PropsOf<typeof type1>> | undefined,
    ReactElement<PropsOf<typeof type2>> | undefined,
    ReactElement<PropsOf<typeof type3>> | undefined,
  ];
}

export function intersperse<T extends ReactNode>(
  items: readonly T[],
  sep: ReactElement,
) {
  const result: ReactNode[] = [];
  for (let i = 0; i < items.length; i++) {
    result.push(items[i]);
    if (i < items.length - 1) {
      result.push(cloneElement(sep, { key: `intersperse-${i}` }));
    }
  }
  return result;
}

/**
 * Merges two sets of props.
 *
 * modified from: https://github.com/razorpay/blade/blob/7e457e9e63fc75ce67e6545b5626c0dd020bc023/packages/blade/src/utils/mergeProps.ts#L9
 */

/**
 * Transforms a props type to reflect that merged refs become RefCallbacks.
 */
type MergedProps<T> = {
  [K in keyof T]: K extends `ref`
    ? T[K] extends Ref<infer R> | undefined
      ? RefCallback<R>
      : T[K]
    : T[K];
};

// oxlint-disable-next-line typescript/no-explicit-any
export const mergeProps = <T extends Record<string, any>>(
  base: T,
  overrides: T,
): MergedProps<T> => {
  const props = { ...base };

  for (const key in overrides) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) {
      continue;
    }
    const overrideValue = overrides[key];

    // Merge refs
    if (key === `ref` && props[key] != null) {
      // @ts-expect-error no overlap
      props[key] = mergeRefs(props[key], overrideValue);
      continue;
    }

    // Merge functions
    if (typeof overrideValue === `function`) {
      const baseValue = base[key];
      if (typeof baseValue === `function`) {
        // @ts-expect-error no overlap
        // oxlint-disable-next-line typescript/no-explicit-any
        props[key] = (...args: any[]) => {
          // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-argument
          overrideValue(...args);
          // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-argument
          baseValue(...args);
        };
        continue;
      }
    }

    props[key] = overrideValue;
  }
  return props as MergedProps<T>;
};
