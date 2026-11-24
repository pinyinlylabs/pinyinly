import { SimpleCronIntervalKind } from "@/client/theme";
import ms from "ms";
import { useSyncExternalStore } from "react";

export const simpleCronIntervalMs = {
  [SimpleCronIntervalKind.Every5Seconds]: ms(`5s`),
  [SimpleCronIntervalKind.Every2Minutes]: ms(`2m`),
  [SimpleCronIntervalKind.Every5Minutes]: ms(`5m`),
  [SimpleCronIntervalKind.Hourly]: ms(`1h`),
  [SimpleCronIntervalKind.Daily]: ms(`1d`),
} satisfies Record<
  (typeof SimpleCronIntervalKind)[keyof typeof SimpleCronIntervalKind],
  number
>;

type CronInterval =
  | (typeof SimpleCronIntervalKind)[keyof typeof SimpleCronIntervalKind]
  | null;

type CronStore = {
  snapshot: number | null;
  listeners: Set<() => void>;
  timeout: ReturnType<typeof setTimeout> | null;
};

const stores = new Map<CronInterval, CronStore>();

function getStore(interval: CronInterval): CronStore {
  let store = stores.get(interval);
  if (store == null) {
    store = {
      snapshot: null,
      listeners: new Set(),
      timeout: null,
    };
    stores.set(interval, store);
  }
  return store;
}

function getSnapshot(interval: CronInterval): number | null {
  if (interval == null) {
    const store = getStore(interval);
    store.snapshot ??= Date.now();
    return store.snapshot;
  }

  const store = getStore(interval);
  store.snapshot ??= Date.now();
  return store.snapshot;
}

function getDelay(interval: CronInterval, currentTime: number): number {
  if (interval == null) {
    return 0;
  }
  const currentDate = new Date(currentTime);
  if (interval === SimpleCronIntervalKind.Hourly) {
    return (
      ms(`1h`) -
      (currentDate.getMinutes() * ms(`1m`) +
        currentDate.getSeconds() * ms(`1s`) +
        currentDate.getMilliseconds())
    );
  }
  if (interval === SimpleCronIntervalKind.Daily) {
    return (
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + 1,
      ).getTime() - currentTime
    );
  }
  const duration = simpleCronIntervalMs[interval];
  return duration - (currentTime % duration);
}

function subscribe(interval: CronInterval, listener: () => void) {
  if (interval == null) {
    return () => void listener;
  }

  const store = getStore(interval);
  store.listeners.add(listener);

  if (store.timeout == null) {
    const update = () => {
      if (store.listeners.size === 0) {
        store.timeout = null;
        return;
      }
      const currentTime = Date.now();
      if (store.snapshot !== currentTime) {
        store.snapshot = currentTime;
        for (const subscribedListener of store.listeners) {
          subscribedListener();
        }
      }
      store.timeout = setTimeout(update, getDelay(interval, currentTime));
    };
    store.timeout = setTimeout(
      update,
      getDelay(interval, store.snapshot ?? Date.now()),
    );
  }

  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0 && store.timeout != null) {
      clearTimeout(store.timeout);
      store.timeout = null;
    }
  };
}

export function useSimpleCronInterval(interval: CronInterval) {
  return useSyncExternalStore(
    (listener) => subscribe(interval, listener),
    () => getSnapshot(interval),
    () => null,
  );
}
