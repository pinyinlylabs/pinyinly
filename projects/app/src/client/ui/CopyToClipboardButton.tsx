import { flip, offset, shift, useFloating } from "@floating-ui/react-native";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { Portal } from "./Portal";
import { RectButton } from "./RectButton";

const gap = 8;

export function CopyToClipboardButton({
  text,
  className = `size-6 rounded p-0 text-fg-muted`,
}: {
  text: string;
  className?: string;
}) {
  const [didCopy, setDidCopy] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    update,
  } = useFloating({
    placement: `top`,
    sameScrollView: false,
    middleware: [shift({ padding: gap }), flip({ padding: gap }), offset(gap)],
  });

  const isInitializingPosition =
    floatingStyles.left === 0 && floatingStyles.top === 0;

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current != null) {
        globalThis.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!didCopy) {
      return;
    }

    update();
  }, [didCopy, update]);

  const handleCopy = async () => {
    const copied = await copyToClipboard(text);
    if (!copied) {
      return;
    }

    if (copiedTimeoutRef.current != null) {
      globalThis.clearTimeout(copiedTimeoutRef.current);
    }

    setDidCopy(true);
    copiedTimeoutRef.current = globalThis.setTimeout(() => {
      setDidCopy(false);
      copiedTimeoutRef.current = null;
    }, 1500);
  };

  const floatingContent = didCopy ? (
    <View
      ref={setFloating}
      collapsable={false}
      style={floatingStyles}
      pointerEvents="none"
      className={isInitializingPosition ? `invisible` : undefined}
    >
      <View className="rounded bg-fg px-2 py-1 shadow-lg">
        <Text className="pyly-body-caption text-bg">Copied</Text>
      </View>
    </View>
  ) : null;

  return (
    <>
      <View
        ref={setReference}
        collapsable={false}
        className="items-end justify-center"
      >
        <RectButton
          variant="bareDim"
          iconStart="copy"
          iconSize={12}
          onPress={() => {
            void handleCopy();
          }}
          className={className}
        />
      </View>
      {didCopy ? (
        Platform.OS === `web` ? (
          <Portal>{floatingContent}</Portal>
        ) : (
          floatingContent
        )
      ) : null}
    </>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (text.length === 0) {
    return false;
  }

  if (!(`navigator` in globalThis)) {
    return false;
  }

  const globalNavigator = globalThis.navigator;
  if (typeof globalNavigator.clipboard.writeText !== `function`) {
    return false;
  }

  try {
    await globalNavigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
