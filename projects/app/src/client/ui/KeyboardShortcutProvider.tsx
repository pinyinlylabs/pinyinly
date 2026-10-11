import {
  KeyboardShortcutModalContext,
  KeyboardShortcutModalIdContext,
} from "@/client/ui/contexts";
import { useEventCallback } from "@/client/ui/hooks/useEventCallback";
import { use, useEffect, useId, useReducer } from "react";
import type { PropsWithChildren } from "react";

interface ModalStackAction {
  id: string;
  active: boolean;
}

function reduceModalStack(
  stack: readonly string[],
  action: ModalStackAction,
): readonly string[] {
  if (action.active) {
    return [...stack.filter((id) => id !== action.id), action.id];
  }
  return stack.filter((id) => id !== action.id);
}

/** Provides modal ownership state for app-wide keyboard shortcuts. */
export function KeyboardShortcutProvider({ children }: PropsWithChildren) {
  const [modalStack, dispatch] = useReducer(reduceModalStack, []);
  const setModalActive = useEventCallback((id: string, active: boolean) => {
    dispatch({ id, active });
  });

  return (
    <KeyboardShortcutModalContext.Provider
      value={{ modalStack, setModalActive }}
    >
      {children}
    </KeyboardShortcutModalContext.Provider>
  );
}

/** Marks descendants as shortcuts belonging to this active modal. */
export function KeyboardShortcutModalScope({
  active,
  children,
}: PropsWithChildren<{ active: boolean }>) {
  const id = useId();
  const modalContext = use(KeyboardShortcutModalContext);

  if (modalContext == null) {
    throw new Error(
      `KeyboardShortcutModalScope must be used within KeyboardShortcutProvider`,
    );
  }
  const { setModalActive } = modalContext;

  useEffect(() => {
    if (!active) {
      return;
    }

    setModalActive(id, true);
    return () => {
      setModalActive(id, false);
    };
  }, [active, id, setModalActive]);

  return (
    <KeyboardShortcutModalIdContext.Provider value={id}>
      {children}
    </KeyboardShortcutModalIdContext.Provider>
  );
}
