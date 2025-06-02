import { use } from "react";

/**
 * Component version of the `use()` hook.
 */
export const Use = <T,>({
  promise,
  render,
}: {
  promise: Promise<T>;
  render: (value: T) => React.ReactNode;
}) => {
  const value = use(promise);
  return render(value);
};
