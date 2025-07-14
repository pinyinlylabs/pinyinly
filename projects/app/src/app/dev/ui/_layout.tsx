import type { Href } from "expo-router";
import { Link, Slot, usePathname } from "expo-router";
import { StrictMode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { demos } from ".";
import { examplesStackClassName } from "./_helpers";

export default function Layout() {
  const insets = useSafeAreaInsets();

  return (
    <StrictMode>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View className="flex-row flex-wrap items-center gap-2 p-2">
          <NavLink href="/dev/ui">(all)</NavLink>

          {Object.keys(demos).map((name) => (
            <NavLink href={`/dev/ui/${name}`} key={name}>
              {name}
            </NavLink>
          ))}

          {([`/`, `/learn`] satisfies Href[]).map((href) => (
            <Link href={href} asChild key={href}>
              <Text
                className={`
                  font-mono text-xs text-fg/80

                  hover:underline
                `}
              >
                {href}
              </Text>
            </Link>
          ))}
        </View>
        <ScrollView contentContainerClassName="flex-1" className="flex-1">
          <Slot />

          {/* Fill the rest of the page if it's too tall for the content */}
          <View className="flex-1 flex-row">
            <View
              className={`
                pyly-color-schema-light theme-default

                ${examplesStackClassName}
              `}
            />
            <View
              className={`
                pyly-color-scheme-dark theme-default

                ${examplesStackClassName}
              `}
            />
          </View>
        </ScrollView>
      </View>
    </StrictMode>
  );
}

function NavLink({
  href,
  children,
}: {
  href: Href;
  children: React.ReactNode;
}) {
  const pathName = usePathname();
  const isActive = pathName === href;

  return (
    <Link href={href} asChild>
      <Text
        className={`
          font-mono text-xs

          ${isActive ? `font-medium text-fg` : `text-fg/50`}

          hover:underline
        `}
      >
        {children}
      </Text>
    </Link>
  );
}
