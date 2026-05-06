import { cssInterop } from "nativewind";
import React from "react";
import { Platform } from "react-native";
import type { StrokeProps } from "react-native-svg";
import { Path } from "react-native-svg";

type PathCssProps = Pick<React.SVGProps<SVGPathElement>, `d` | `className`> &
  Pick<StrokeProps, `strokeDasharray` | `strokeWidth`> & {
    onPress?: () => void;
    onHoverIn?: () => void;
    onHoverOut?: () => void;
  };

const PathCssRn = cssInterop(Path, {
  className: {
    target: false,
    nativeStyleToProp: {
      fill: true,
      stroke: true,
    },
  },
});

const PathCssWeb = ({
  strokeDasharray,
  onPress,
  onHoverIn,
  onHoverOut,
  ...props
}: PathCssProps) => {
  return (
    <path
      strokeDasharray={
        Array.isArray(strokeDasharray)
          ? strokeDasharray.join(`,`)
          : (strokeDasharray as string | number | undefined)
      }
      onClick={
        onPress == null
          ? undefined
          : (e) => {
              e.stopPropagation();
              onPress();
            }
      }
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      {...props}
    />
  );
};

const PathCssNative = ({
  onHoverIn: _onHoverIn,
  onHoverOut: _onHoverOut,
  ...props
}: PathCssProps) => {
  return <PathCssRn {...props} />;
};

export const PathCss = Platform.select<React.ComponentType<PathCssProps>>({
  web: PathCssWeb,
  default: PathCssNative,
});
