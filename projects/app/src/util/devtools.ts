import type { DeviceStoreToggleableEntity } from "@/client/deviceStore";
import { deviceStoreGet } from "@/client/deviceStore";
import { r } from "./rizzle";

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function devToolsSlowQuerySleepIfEnabled(): Promise<void> {
  const setting = await deviceStoreGet(slowQueriesSetting);
  if (setting?.enabled ?? false) {
    await sleep(1000);
  }
}

export const slowQueriesSetting = r.entity(`settings.developer.slowQueries`, {
  enabled: r.boolean(`e`),
}) satisfies DeviceStoreToggleableEntity;

const noOp = () => {
  // do nothing
};

const isVitestBenchMode = process.env[`MODE`] === `bench`;
const hasPerformanceApi = typeof performance !== `undefined`;

let performanceMeasureCounter = 0;

export const startPerformanceMilestones: (
  label: string,
) => (milestone?: string) => void =
  hasPerformanceApi && !isVitestBenchMode
    ? (label) => {
        const id = ++performanceMeasureCounter;
        const base = `${label}#${id}`;
        const marks: string[] = [];

        const createMark = (suffix: string) => {
          const markName = `${base}:${suffix}`;
          performance.mark(markName);
          marks.push(markName);
          return markName;
        };

        let lastMark = createMark(`start`);
        let ended = false;

        return (milestone) => {
          if (ended) {
            return;
          }

          const suffix = milestone ?? `end`;
          const nextMark = createMark(suffix);
          performance.measure(`${base}:${suffix}`, lastMark, nextMark);

          if (milestone == null) {
            ended = true;
            for (const mark of marks) {
              performance.clearMarks(mark);
            }
          } else {
            lastMark = nextMark;
          }
        };
      }
    : () => noOp;
