import { useState } from "react";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { RectButton } from "./RectButton";

interface ExpandableOverflowType {
  collapsedMaxHeight: number;
}

export function WikiTitledBox({
  title,
  children,
  contentTestID,
  className,
  headerCustomAction,
  onEditingChange,
  expandableOverflow,
  onLayout,
}: {
  title: string;
  children: React.ReactNode;
  contentTestID?: ViewProps[`testID`];
  className?: ViewProps[`className`];
  headerCustomAction?: React.ReactNode;
  onEditingChange?: (isEditing: boolean) => void;
  expandableOverflow?: ExpandableOverflowType;
  onLayout?: ViewProps[`onLayout`];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverflowExpandable = expandableOverflow != null;
  const headerAction =
    headerCustomAction ??
    (onEditingChange == null ? null : isEditing ? (
      <RectButton
        variant="barePrimary"
        onPress={() => {
          setIsEditing(false);
          onEditingChange(false);
        }}
      >
        Done
      </RectButton>
    ) : (
      <RectButton
        variant="bareDim"
        iconStart="pencil"
        onPress={() => {
          setIsEditing(true);
          onEditingChange(true);
        }}
      >
        Edit
      </RectButton>
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
            )}

            <View className="relative">
              <View
                testID={contentTestID}
                className="overflow-hidden"
                style={
                  isExpanded
                    ? undefined
                    : { maxHeight: expandableOverflow.collapsedMaxHeight }
                }
              >
                {children}
              </View>

              {isExpanded ? null : (
                <View
                  className={`
                    pointer-events-none absolute inset-x-0 bottom-0 h-20 overflow-hidden
                    rounded-b-lg
                  `}
                >
                  <View
                    className={`
                      absolute inset-0 bg-bg-high/80 backdrop-blur-sm

                      [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_55%,black)]

                      [mask-image:linear-gradient(to_bottom,transparent,black_55%,black)]
                    `}
                  />
                </View>
              )}
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
