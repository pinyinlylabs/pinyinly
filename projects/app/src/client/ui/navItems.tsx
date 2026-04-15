import { QuizQueueLozenge } from "@/client/ui/QuizQueueLozenge";
import type { Href } from "expo-router";
import type { ReactNode } from "react";

export interface NavItem {
  name: string;
  href: Href;
  lozenge?: ReactNode;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
  primary?: boolean;
}

export const navItems: NavGroup[] = [
  {
    title: `Learning`,
    primary: true,
    items: [
      {
        name: `Practice`,
        href: `/learn`,
        lozenge: <QuizQueueLozenge />,
      },
      { name: `Wiki`, href: `/wiki` },
      { name: `Sounds`, href: `/sounds` },
      { name: `Skills`, href: `/skills` },
      { name: `History`, href: `/history` },
    ] satisfies NavItem[],
  },
  {
    title: `Settings`,
    primary: true,
    items: [
      { name: `Profile`, href: `/settings/profile` },
      { name: `Accounts`, href: `/settings/accounts` },
      { name: `Appearance`, href: `/settings/appearance` },
    ] satisfies NavItem[],
  },
  {
    items: [
      { name: `Developer`, href: `/settings/developer` },
      { name: `Acknowledgements`, href: `/acknowledgements` },
    ] satisfies NavItem[],
  },
];
