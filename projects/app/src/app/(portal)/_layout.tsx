import { RectButton } from "@/client/ui/RectButton";
import { invariant } from "@haohaohow/lib/invariant";
import { Link } from "expo-router";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SideNavLayout() {
  return (
    <Tabs
      className={`
        flex-1 flex-col-reverse items-stretch self-stretch

        md:flex-row
      `}
    >
      {/* ROUTE DECLARATIONS */}
      <TabList className="hidden">
        <TabTrigger name="Overview" href="/overview2" />
        <TabTrigger name="Skills" href="/skills2" />
        <TabTrigger name="Profile" href="/profile2" />
        <TabTrigger name="Learn2" href="/learn2" />
        <TabTrigger name="History" href="/history2" />
      </TabList>

      <ScrollView contentContainerClassName="py-safe-offset-5 px-safe-or-4 flex-row">
        {/* Left side */}
        <View
          className={`
            min-w-[240px] items-end pr-[32px]

            portal-lg:flex-1
          `}
        >
          <View className="sticky items-end top-safe-offset-5">
            <View className="mb-5 h-[32px] justify-center">
              <Link href="/learn" asChild>
                <RectButton variant="bare">Back to app</RectButton>
              </Link>
            </View>

            <View className="w-[200px] items-stretch rounded-xl bg-background-1 py-3">
              <TabButtonSectionTitle name="Learning" />
              <TabButton2 name="Overview" />
              <TabButton2 name="Skills" />
              <TabButton2 name="History" />
              <TabButton2 name="Tutoring" />
              <TabButton2 name="Wiki" />

              {/* GAP */}
              <View className="invisible h-[40px]" />

              <TabButtonSectionTitle name="Settings" />
              <TabButton2 name="Profile" />
              <TabButton2 name="Courses" />
              <TabButton2 name="Appearance" />
              <TabButton2 name="Notifications" />
              <TabButton2 name="Billing" />
              <TabButton2 name="Support" />
            </View>

            {/* GAP */}
            <View className="invisible min-h-10 flex-1" />

            <View className="items-end px-5">
              <FooterLink text="Logout" />
              <FooterLink text="Terms" />
              <FooterLink text="Privacy Policy" />
              <FooterLink text="Acknowledgements" />
            </View>
          </View>
        </View>

        {/* Middle */}
        <View
          className={`
            flex-1

            portal-lg:w-[600px] portal-lg:max-w-[600px] portal-lg:flex-none
          `}
        >
          <TabSlot />
        </View>

        {/* Right side */}
        <View className={`portal-lg:flex-1`}></View>
      </ScrollView>

      {/* is this needed? */}
      <StatusBar style="auto" />
    </Tabs>
  );
}

function FooterLink({ text }: { text: string }) {
  return (
    <View className="h-[32px] justify-center">
      <Text className="font-sans text-sm/normal font-light uppercase text-caption">
        {text}
      </Text>
    </View>
  );
}

function TabButtonSectionTitle({ name }: { name: string }) {
  return (
    <View className="h-[24px] items-end justify-center px-[24px]">
      <Text className="hhh-body-dt">{name}</Text>
    </View>
  );
}

const TabButton2 = ({ name }: { name: string }) => (
  <TabTrigger name={name} asChild>
    {/* <TabTrigger> will .cloneElement() and pass through props like `href` */}
    <TabButton2Inner name={name} />
  </TabTrigger>
);

const TabButton2Inner = ({
  isFocused = false,
  name = ``,
  ...rest
}: {
  isFocused?: boolean;
  name?: string;
}) => {
  if (__DEV__) {
    invariant(`href` in rest, `TabButton2Inner requires 'href' prop`);
  }
  return (
    <Pressable {...rest}>
      <View className={buttonContainerClass({ isFocused })}>
        <Text className="font-sans text-sm/normal font-normal uppercase text-foreground">
          {name}
        </Text>
      </View>
    </Pressable>
  );
};

const buttonContainerClass = tv({
  base: `
    h-[32px] flex-1 items-end justify-center px-[24px]

    hover:bg-foreground/5
  `,
  variants: {
    isFocused: {
      true: `bg-foreground/10`,
    },
  },
});
