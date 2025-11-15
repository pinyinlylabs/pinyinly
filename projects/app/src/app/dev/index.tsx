import { RectButton } from "@/client/ui/RectButton";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function DevIndexPage() {
  return (
    <View className="flex-1 bg-bg">
      <View className="px-8 py-6">
        <Text className="pyly-body-title mb-2 text-fg">Development Tools</Text>
        <Text className="pyly-body mb-8 text-fg/70">
          Access development utilities, debugging tools, and component demos.
        </Text>
        
        <View className="gap-4">
          <DevToolCard
            title="Authentication & Sessions"
            description="Manage user sessions, test login flows, and debug authentication"
            href="/dev/auth"
          />
          
          <DevToolCard
            title="UI Components"
            description="Browse and test all UI components with interactive demos"
            href="/dev/ui"
          />
          
          <DevToolCard
            title="API Debugging"
            description="Test API endpoints and debug server-side functionality"
            href="/dev/api"
          />
        </View>
      </View>
    </View>
  );
}

function DevToolCard({ title, description, href }: {
  title: string;
  description: string;
  href: `/dev/auth` | `/dev/ui` | `/dev/api`;
}) {
  return (
    <Link href={href} asChild>
      <RectButton variant="outline" className="p-0">
        <View className="p-4">
          <Text className="pyly-body-heading mb-1 text-fg">{title}</Text>
          <Text className="pyly-body-caption text-fg/60">{description}</Text>
        </View>
      </RectButton>
    </Link>
  );
}