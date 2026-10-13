import { useStudyToggle } from "@/client/ui/hooks/useStudyToggle";
import type { HanziWord } from "@/data/model";
import { Pressable } from "react-native";
import { DropdownMenu2 } from "./DropdownMenu2";
import { Icon } from "./Icon";
import { Text } from "./Text";

export function WikiHanziStudyMenu({
  hanziWord,
}: {
  hanziWord: HanziWord | null;
}) {
  return (
    <DropdownMenu2>
      <DropdownMenu2.Trigger asChild>
        <Pressable
          accessibilityLabel="More options"
          accessibilityRole="button"
          className={`
            size-8 items-center justify-center rounded-md

            hover:bg-fg/5

            web:transition-colors
          `}
        >
          <Icon icon="more-horizontal" size={20} />
        </Pressable>
      </DropdownMenu2.Trigger>
      <DropdownMenu2.Content align="end" sideOffset={4}>
        {hanziWord == null ? (
          <DropdownMenu2.Item disabled>
            <Text>Study item</Text>
          </DropdownMenu2.Item>
        ) : (
          <StudyMenuItem hanziWord={hanziWord} />
        )}
      </DropdownMenu2.Content>
    </DropdownMenu2>
  );
}

function StudyMenuItem({ hanziWord }: { hanziWord: HanziWord }) {
  const { isStudying, isLoading, toggle } = useStudyToggle(hanziWord);
  return (
    <DropdownMenu2.CheckboxItem
      checked={isStudying}
      disabled={isLoading}
      onCheckedChange={toggle}
    >
      <Text>Study item</Text>
    </DropdownMenu2.CheckboxItem>
  );
}
