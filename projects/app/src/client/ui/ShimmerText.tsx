import type { TextProps } from "react-native";
import { Platform, Text } from "react-native";

export function ShimmerText({
  children,
  className = ``,
  style,
}: Pick<TextProps, `children` | `className` | `style`>) {
  if (Platform.OS !== `web`) {
    return (
      <Text
        className={`
          ${className}

          text-fg-dim
        `}
        style={style}
      >
        {children}
      </Text>
    );
  }

  return (
    <Text
      className={`
        ${className}

        animate-shimmerText
        bg-[repeating-linear-gradient(90deg,_var(--color-fg-dim)_0%,_var(--color-fg-dim)_32%,_var(--color-fg-loud)_44%,_var(--color-fg-loud)_50%,_var(--color-fg-loud)_56%,_var(--color-fg-dim)_68%,_var(--color-fg-dim)_100%)]

        bg-[length:200%_100%]

        bg-clip-text text-transparent
      `}
      style={style}
    >
      {children}
    </Text>
  );
}
