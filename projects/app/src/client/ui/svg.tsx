import { cssInterop } from "nativewind";
import React from "react";
import { Platform } from "react-native";
import type { StrokeProps } from "react-native-svg";
import { Path } from "react-native-svg";

type PathCssProps = Pick<React.SVGProps<SVGPathElement>, `d` | `className`> &
  Pick<StrokeProps, `strokeDasharray` | `strokeWidth`>;

const PathCssRn = cssInterop(Path, {
  className: {
    target: false,
    nativeStyleToProp: {
      fill: true,
      stroke: true,
    },
  },
});

const PathCssWeb = ({ strokeDasharray, ...props }: PathCssProps) => {
  return (
    <path
      strokeDasharray={
        Array.isArray(strokeDasharray)
          ? strokeDasharray.join(`,`)
          : (strokeDasharray as string | number | undefined)
      }
      {...props}
    />
  );
};

export const PathCss = Platform.select<React.ComponentType<PathCssProps>>({
  web: PathCssWeb,
  default: PathCssRn,
});
