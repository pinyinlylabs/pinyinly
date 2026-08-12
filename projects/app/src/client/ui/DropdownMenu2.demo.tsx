import { ExampleStack } from "@/client/ui/demo/components";
import { View, Text } from "react-native";
import { DropdownMenu2 } from "./DropdownMenu2";
import { RectButton } from "./RectButton";

export default () => {
  return (
    <View className="flex-1">
      <ExampleStack title="default" childrenClassName="items-start">
        <DropdownMenu2>
          <DropdownMenu2.Trigger asChild>
            <RectButton variant="outline">
              <Text>Open</Text>
            </RectButton>
          </DropdownMenu2.Trigger>
          <DropdownMenu2.Content sideOffset={2} className="w-56" align="start">
            <DropdownMenu2.Label>My Account</DropdownMenu2.Label>
            <DropdownMenu2.Separator />
            <DropdownMenu2.Group>
              <DropdownMenu2.Item>
                <Text>Profile</Text>
                <DropdownMenu2.Shortcut>⇧⌘P</DropdownMenu2.Shortcut>
              </DropdownMenu2.Item>
              <DropdownMenu2.Item>
                <Text>Billing</Text>
                <DropdownMenu2.Shortcut>⌘B</DropdownMenu2.Shortcut>
              </DropdownMenu2.Item>
              <DropdownMenu2.Item>
                <Text>Settings</Text>
                <DropdownMenu2.Shortcut>⌘S</DropdownMenu2.Shortcut>
              </DropdownMenu2.Item>
              <DropdownMenu2.Item>
                <Text>Keyboard shortcuts</Text>
                <DropdownMenu2.Shortcut>⌘K</DropdownMenu2.Shortcut>
              </DropdownMenu2.Item>
            </DropdownMenu2.Group>
            <DropdownMenu2.Separator />
            <DropdownMenu2.Group>
              <DropdownMenu2.Item>
                <Text>Team</Text>
              </DropdownMenu2.Item>
              <DropdownMenu2.Sub>
                <DropdownMenu2.SubTrigger>
                  <Text>Invite users</Text>
                </DropdownMenu2.SubTrigger>
                <DropdownMenu2.SubContent>
                  <DropdownMenu2.Item>
                    <Text>Email</Text>
                  </DropdownMenu2.Item>
                  <DropdownMenu2.Item>
                    <Text>Message</Text>
                  </DropdownMenu2.Item>
                  <DropdownMenu2.Separator />
                  <DropdownMenu2.Item>
                    <Text>More...</Text>
                  </DropdownMenu2.Item>
                </DropdownMenu2.SubContent>
              </DropdownMenu2.Sub>
              <DropdownMenu2.Item>
                <Text>New Team</Text>
                <DropdownMenu2.Shortcut>⌘+T</DropdownMenu2.Shortcut>
              </DropdownMenu2.Item>
            </DropdownMenu2.Group>
            <DropdownMenu2.Separator />
            <DropdownMenu2.Item>
              <Text>GitHub</Text>
            </DropdownMenu2.Item>
            <DropdownMenu2.Item>
              <Text>Support</Text>
            </DropdownMenu2.Item>
            <DropdownMenu2.Item disabled>
              <Text>API</Text>
            </DropdownMenu2.Item>
            <DropdownMenu2.Separator />
            <DropdownMenu2.Item>
              <Text>Log out</Text>
              <DropdownMenu2.Shortcut>⇧⌘Q</DropdownMenu2.Shortcut>
            </DropdownMenu2.Item>
          </DropdownMenu2.Content>
        </DropdownMenu2>
      </ExampleStack>
    </View>
  );
};
