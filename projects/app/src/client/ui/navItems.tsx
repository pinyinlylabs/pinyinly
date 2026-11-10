import { QuizQueueLozenge } from "@/client/ui/QuizQueueLozenge";
import type { UserSettingEntityLike } from "@/client/ui/hooks/useUserSetting";
import { soundsPageUserToggleSetting } from "@/data/userSettings";
import type { UserSettingToggleableEntity } from "@/data/userSettings";
import type { Href } from "expo-router";
import type { ReactNode } from "react";

export interface NavItem {
  name: string;
  href: Href;
  lozenge?: ReactNode;
  /** Only show this item when the given user-setting toggle is enabled. */
  guard?: UserSettingEntityLike<UserSettingToggleableEntity>;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
  primary?: boolean;
}

export const navItems: NavGroup[] = [
  {
    primary: true,
    items: [
      {
        name: `Practice`,
        href: `/learn`,
        lozenge: <QuizQueueLozenge />,
      },
      { name: `Wiki`, href: `/wiki` },
      {
        name: `Sounds`,
        href: `/sounds`,
        guard: soundsPageUserToggleSetting,
      },
      { name: `Skills`, href: `/skills` },
      { name: `History`, href: `/history` },
    ] satisfies NavItem[],
  },
  {
    title: `Settings`,
    primary: true,
    items: [
      { name: `Profile`, href: `/profile` },
      { name: `Settings`, href: `/settings` },
    ] satisfies NavItem[],
  },
  {
    items: [{ name: `Switch profile`, href: `/profile/switch` }],
  },
  {
    items: [
      { name: `Acknowledgements`, href: `/acknowledgements` },
      { name: `Developer`, href: `/settings/developer` },
    ] satisfies NavItem[],
  },
];
