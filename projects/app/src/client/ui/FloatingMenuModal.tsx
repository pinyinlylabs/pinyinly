import { mergeProps } from "@/client/react";
import { flip, offset, shift, useFloating } from "@floating-ui/react-native";
import type { ReactElement, RefAttributes } from "react";
import { cloneElement, useState } from "react";
import type { PressableProps } from "react-native";
import { Modal, TouchableOpacity, View } from "react-native";

const gap = 8;

export interface FloatingMenuModalMenuProps {
  /** Allow the menu to close the floating menu. */
  onRequestClose?: () => void;
}

export function FloatingMenuModal(props: {
  menu: ReactElement<FloatingMenuModalMenuProps>;
  children: ReactElement<
    Pick<PressableProps, `onTouchEnd` | `onPress`> & RefAttributes<View>
  >;
}) {
  const { refs, floatingStyles } = useFloating({
    placement: `top`,
    sameScrollView: false,
    middleware: [shift({ padding: gap }), flip({ padding: gap }), offset(gap)],
  });
  const [isOpen, setIsOpen] = useState(false);

  // To avoid flash of floating ui content at top. If the position is zero hide
  // the floating element.This happens because measure is async and it takes few
  // miliseconds to calculate the positions.
  const isInitializing = floatingStyles.left === 0 && floatingStyles.top === 0;

  const toggleOpen = () => {
    setIsOpen((isOpen) => !isOpen);
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Cloning the trigger children to enhance it with ref and event handler */}
      {cloneElement(
        props.children,
        mergeProps(props.children.props, {
          ref: refs.setReference,
          // for Desktop
          onPress: toggleOpen,
          // for Mobile
          onTouchEnd: toggleOpen,
        }),
      )}
      <Modal
        collapsable={false}
        transparent
        visible={isOpen}
        onRequestClose={handleDismiss}
      >
        <TouchableOpacity
          className="shrink-0 grow bg-bg/50"
          onPress={handleDismiss}
          activeOpacity={1}
          testID="tooltip-modal-backdrop"
        >
          <View
            ref={refs.setFloating}
            collapsable={false}
            style={floatingStyles}
            className={isInitializing ? `invisible` : undefined}
          >
            {cloneElement(
              props.menu,
              mergeProps(props.menu.props, {
                onRequestClose: handleDismiss,
              }),
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
