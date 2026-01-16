import { mergeProps } from "#client/react.js";
import { describe, expect, test, vi } from "vitest";

describe(`mergeProps suite` satisfies HasNameOf<typeof mergeProps>, () => {
  test(`should merge two basic props`, () => {
    expect(mergeProps({ a: 1, b: 2 }, { c: 3 })).toStrictEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });

  test(`should merge two function props`, () => {
    const functionOne = vi.fn();
    const functionTwo = vi.fn();
    const mergedFunction = mergeProps(
      { callback: functionOne },
      { callback: functionTwo },
    );
    expect(mergedFunction).toBeTruthy();

    expect(functionOne).toHaveBeenCalledTimes(0);
    expect(functionTwo).toHaveBeenCalledTimes(0);

    const passedArgs = `passed args`;
    mergedFunction.callback(passedArgs);

    expect(functionOne).toHaveBeenCalledWith(passedArgs);
    expect(functionTwo).toHaveBeenCalledWith(passedArgs);
  });

  test(`should merge two ref props`, () => {
    const refOne = vi.fn();
    const refTwo = vi.fn();
    const mergedRef = mergeProps({ ref: refOne }, { ref: refTwo });
    expect(mergedRef).toBeTruthy();

    expect(refOne).toHaveBeenCalledTimes(0);
    expect(refTwo).toHaveBeenCalledTimes(0);

    const element = Symbol();
    mergedRef.ref(element);

    expect(refOne).toHaveBeenCalledWith(element);
    expect(refTwo).toHaveBeenCalledWith(element);

    mergedRef.ref(null);

    expect(refOne).toHaveBeenCalledWith(null);
    expect(refTwo).toHaveBeenCalledWith(null);
  });

  test(`should merge useRef objects and update .current`, () => {
    const refOne = { current: null as unknown };
    const refTwo = { current: null as unknown };
    const mergedRef = mergeProps({ ref: refOne }, { ref: refTwo });
    expect(mergedRef).toBeTruthy();

    expect(refOne.current).toBeNull();
    expect(refTwo.current).toBeNull();

    const element = Symbol();
    (mergedRef.ref as unknown as (value: unknown) => void)(element);

    expect(refOne.current).toBe(element);
    expect(refTwo.current).toBe(element);

    (mergedRef.ref as unknown as (value: unknown) => void)(null);

    expect(refOne.current).toBeNull();
    expect(refTwo.current).toBeNull();
  });
});
