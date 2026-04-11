import type { Href } from "expo-router";

export interface NavItem {
  name: string;
  href: Href;
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
      { name: `Practice`, href: `/learn` },
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
