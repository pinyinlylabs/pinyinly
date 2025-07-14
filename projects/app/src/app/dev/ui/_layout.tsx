import type { Href } from "expo-router";
import { Link, Slot, usePathname } from "expo-router";
import { StrictMode } from "react";
import { ScrollView, Text, View } from "react-native";
import { demos } from ".";
import { examplesStackClassName } from "./_helpers";

export default function Layout() {
  return (
    <StrictMode>
      <ScrollView contentContainerClassName="flex-1 pt-safe" className="flex-1">
        <View className={`flex-row flex-wrap items-center gap-2 p-2`}>
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

        <Slot />

        {/* Fill the rest of the page if it's too tall for the content */}
        <View
          className={`
            flex-1

            lg:flex-row
          `}
        >
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
