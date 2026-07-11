import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function SkillsPage() {
  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/skills">Skills</Breadcrumbs.Item>
      </Breadcrumbs>

      <View>
        <Text className="pyly-body-title">Skills</Text>
        <HeaderTitleProvider.ScrollTrigger title="Skills" />
      </View>

      <View className="gap-2">
        <Text className="pyly-body-caption text-fg-dim">HSK</Text>
        {([1, 2, 3, 4] as const).map((level) => (
          <Link href={`/skills/hsk/${level}`} asChild key={level}>
            <Pressable
              className={`
                flex-row items-center justify-between rounded-xl border border-fg/10 bg-bg-high px-4
                py-3

                hover:bg-fg/5
              `}
            >
              <View className="flex-row items-center gap-3">
                <Text className="pyly-body-title text-fg-loud">{`HSK ${level}`}</Text>
              </View>
              <Text className="pyly-body-caption text-fg-dim">Open</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}
