import type { HskLevel } from "./model";

export function hskLevelToNumber(hsk: HskLevel): number {
  switch (hsk) {
    case `1`:
      return 1;
    case `2`:
      return 2;
    case `3`:
      return 3;
    case `4`:
      return 4;
    case `5`:
      return 5;
    case `6`:
      return 6;
    case `7-9`:
      return 7;
  }
}
