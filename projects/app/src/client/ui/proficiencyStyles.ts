import type { ProficiencyColor } from "@/data/skills";
import type { LozengeColor } from "./Lozenge";

export const proficiencyStyle = {
  "muted-fg": {
    lozengeColor: `muted-fg`,
    badgeClass: `border-transparent bg-fg/5`,
    badgeProgressClass: `bg-fg/10`,
    barProgressClass: `bg-fg/30`,
  },
  blue: {
    lozengeColor: `blue`,
    badgeClass: `border-blue/50 bg-blue/5`,
    badgeProgressClass: `bg-blue/20`,
    barProgressClass: `bg-blue`,
  },
  emerald: {
    lozengeColor: `emerald`,
    badgeClass: `border-emerald/50 bg-emerald/5`,
    badgeProgressClass: `bg-emerald/20`,
    barProgressClass: `bg-emerald`,
  },
  violet: {
    lozengeColor: `violet`,
    badgeClass: `border-violet/50 bg-violet/5`,
    badgeProgressClass: `bg-violet/20`,
    barProgressClass: `bg-violet`,
  },
  amber: {
    lozengeColor: `amber`,
    badgeClass: `border-amber/50 bg-amber/10`,
    badgeProgressClass: `bg-amber/20`,
    barProgressClass: `bg-amber`,
  },
} satisfies Record<
  ProficiencyColor,
  {
    lozengeColor: LozengeColor;
    badgeClass: string;
    badgeProgressClass: string;
    barProgressClass: string;
  }
>;

export function proficiencyFillProgress(progress: number): number {
  return 0.1 + Math.max(0, Math.min(progress, 1)) * 0.9;
}
