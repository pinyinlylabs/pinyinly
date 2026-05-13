import { useState } from "react";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { WikiEditButton } from "./WikiEditButton";
import { RectButton } from "./RectButton";

export function WikiTitledBox({
  title,
  children,
  contentTestID,
  className,
  headerCustomAction,
  onEditingChange,
  collapsedMaxHeight,
  onLayout,
}: {
  title: string;
  children: React.ReactNode;
  contentTestID?: ViewProps[`testID`];
  className?: ViewProps[`className`];
  headerCustomAction?: React.ReactNode;
  onEditingChange?: (isEditing: boolean) => void;
  collapsedMaxHeight?: number;
  onLayout?: ViewProps[`onLayout`];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverflowExpandable = collapsedMaxHeight != null;
  const headerAction =
    headerCustomAction ??
    (onEditingChange == null ? null : (
      <WikiEditButton
        editing={isEditing}
        onPress={() => {
          const next = !isEditing;
          setIsEditing(next);
          onEditingChange(next);
        }}
      />
    ));

  return (
    <View className={containerClass({ className })} onLayout={onLayout}>
      <View className="flex-row items-center">
        <Text className="pyly-body-subheading flex-1">{title}</Text>
        {headerAction}
      </View>

      <View className="relative rounded-lg bg-bg-high">
        {isOverflowExpandable ? (
          <>
            {isExpanded ? null : (
              <>
                <View
                  className={`
                    pointer-events-none absolute inset-x-0 bottom-2 z-10 h-20 backdrop-blur-sm

                    [mask-image:linear-gradient(to_bottom,transparent,black_45%,black)]
                  `}
                />
                <View className="absolute inset-x-0 bottom-2 z-10 items-center">
                  <RectButton
                    variant="bareDim"
                    iconStart="chevron-down-circled"
                    onPress={() => {
                      setIsExpanded(true);
                    }}
                  >
                    Expand
                  </RectButton>
                </View>
              </>
            )}

            <View className="relative">
              <View
                testID={contentTestID}
                className={`
                  overflow-hidden rounded-t-lg

                  ${
                    isExpanded
                      ? ``
                      : `[mask-image:linear-gradient(to_bottom,black,black_55%,transparent)]`
                  }
                `}
                style={
                  isExpanded ? undefined : { maxHeight: collapsedMaxHeight }
                }
              >
                {children}
              </View>
            </View>

            {isExpanded ? (
              <View className="px-2 pb-2 pt-1">
                <RectButton
                  variant="bareDim"
                  iconStart="chevron-up-circled"
                  onPress={() => {
                    setIsExpanded(false);
                  }}
                >
                  Collapse
                </RectButton>
              </View>
            ) : null}
          </>
        ) : (
          <View testID={contentTestID}>{children}</View>
        )}
      </View>
    </View>
  );
}

const containerClass = tv({
  base: `gap-2`,
});
