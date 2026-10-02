import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { Tabs } from "@/client/ui/Tabs";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export default () => (
  <View className="flex-1 gap-4">
    <LittlePrimaryHeader title="Basic Tabs" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="Simple tabs" showFrame>
        <Tabs defaultValue="overview" className="w-100">
          <Tabs.List className="flex-row gap-1">
            <Tabs.Trigger value="overview" className="flex-1">
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger value="analytics" className="flex-1">
              Analytics
            </Tabs.Trigger>
            <Tabs.Trigger value="reports" className="flex-1">
              Reports
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="overview" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Overview
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                View your key metrics and recent project activity. Track
                progress across all your active projects.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="analytics" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Analytics
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                Track performance and user engagement metrics. Monitor trends
                and identify growth opportunities.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="reports" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Reports
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                Generate and download your detailed reports. Export data in
                multiple formats for analysis.
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </ExampleStack>

      <ExampleStack title="Two tabs (Upload/Generate)" showFrame>
        <Tabs defaultValue="upload" className="w-100">
          <Tabs.List className="flex-row gap-1">
            <Tabs.Trigger value="upload" className="flex-1">
              Upload
            </Tabs.Trigger>
            <Tabs.Trigger value="generate" className="flex-1">
              Generate
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="upload" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Upload your image files here. Drag and drop or click to browse.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="generate" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Generate AI images using prompts. Describe what you want to
                create.
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="Many Tabs" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="Five tabs" showFrame>
        <Tabs defaultValue="home" className="w-125">
          <Tabs.List className="flex-row gap-1">
            <Tabs.Trigger value="home" className="flex-1">
              Home
            </Tabs.Trigger>
            <Tabs.Trigger value="profile" className="flex-1">
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger value="messages" className="flex-1">
              Messages
            </Tabs.Trigger>
            <Tabs.Trigger value="settings" className="flex-1">
              Settings
            </Tabs.Trigger>
            <Tabs.Trigger value="help" className="flex-1">
              Help
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="home" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Home
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                Welcome to your dashboard.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="profile" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Profile
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                Manage your profile settings.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="messages" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Messages
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                View your recent messages.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="settings" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Settings
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                Configure your preferences.
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="help" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-base font-bold text-fg">
                Help
              </Text>
              <Text className="mt-2 font-sans text-sm text-muted-fg">
                Get help and support.
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="Disabled State" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="With disabled tab" showFrame>
        <Tabs defaultValue="tab1" className="w-100">
          <Tabs.List className="flex-row gap-1">
            <Tabs.Trigger value="tab1" className="flex-1">
              Tab 1
            </Tabs.Trigger>
            <Tabs.Trigger value="tab2" className="flex-1" disabled>
              Tab 2 (Disabled)
            </Tabs.Trigger>
            <Tabs.Trigger value="tab3" className="flex-1">
              Tab 3
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Content for Tab 1
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="tab2" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Content for Tab 2
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="tab3" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Content for Tab 3
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="Layout Variations" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="Tabs in narrow container" showFrame>
        <Tabs defaultValue="a" className="w-[250px]">
          <Tabs.List className="flex-row gap-1">
            <Tabs.Trigger value="a" className="flex-1">
              A
            </Tabs.Trigger>
            <Tabs.Trigger value="b" className="flex-1">
              B
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Tab A content
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="b" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Tab B content
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </ExampleStack>

      <ExampleStack title="Tabs without flex-1" showFrame>
        <Tabs defaultValue="first" className="w-100">
          <Tabs.List className="flex-row gap-1">
            <Tabs.Trigger value="first">First Tab</Tabs.Trigger>
            <Tabs.Trigger value="second">Second</Tabs.Trigger>
            <Tabs.Trigger value="third">Third</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="first" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                First tab content
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="second" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Second tab content
              </Text>
            </View>
          </Tabs.Content>
          <Tabs.Content value="third" className="mt-3">
            <View className="rounded-lg border border-fg/10 bg-fg/5 p-4">
              <Text className="font-sans text-sm text-muted-fg">
                Third tab content
              </Text>
            </View>
          </Tabs.Content>
        </Tabs>
      </ExampleStack>
    </View>
  </View>
);
