import { invariant } from "@pinyinly/lib/invariant";

interface PylyMemoryLeakState {
  processListenerMonitorInitialized?: boolean;
  processListenerMaxCountSeen?: Record<`exit` | `beforeExit`, number>;
  processListenerAddStackCount?: Record<string, number>;
  serverMemoryLastLogAtMs?: number;
}

declare global {
  var __pylyMemoryLeak: PylyMemoryLeakState | undefined;
}

const processListenerEvents = [`exit`, `beforeExit`] as const;

const maxAllowedProcessListenerCount = process.getMaxListeners();
const alwaysReportProcessListenerCountThreshold = 10;
const mebibyte = 1024 * 1024;

const ansi = {
  reset: `\x1b[0m`,
  bold: `\x1b[1m`,
  fgValueGray: `\x1b[38;5;250m`,
  fgGray: `\x1b[90m`,
} as const;

function formatMebibytes(bytes: number): string {
  return `${Math.round(bytes / mebibyte)} MiB`;
}

function formatHeapMetric(name: string, bytes: number): string {
  return `${ansi.fgGray}${name}=${ansi.fgValueGray}${formatMebibytes(bytes)}${ansi.reset}`;
}

function maybeWarnOnExcessiveProcessListeners(
  pylyMemoryLeakState: PylyMemoryLeakState,
): void {
  if (process.env.NODE_ENV !== `development`) {
    return;
  }

  const maxCountSeen =
    pylyMemoryLeakState.processListenerMaxCountSeen ??
    (pylyMemoryLeakState.processListenerMaxCountSeen = {
      exit: 0,
      beforeExit: 0,
    });

  for (const event of processListenerEvents) {
    const count = process.listenerCount(event);

    if (
      count <= maxAllowedProcessListenerCount ||
      count <= maxCountSeen[event]
    ) {
      continue;
    }

    maxCountSeen[event] = count;
    console.warn(
      [
        `PROCESS LISTENER COUNT HIGH`,
        `  event : ${event}`,
        `  count : ${count}`,
        `  max   : ${maxAllowedProcessListenerCount}`,
        `  source: middleware`,
      ].join(`\n`),
    );
  }
}

export function processListenerMemoryLeakMiddleware(): void {
  const pylyMemoryLeakState = (globalThis.__pylyMemoryLeak ??= {});

  if (pylyMemoryLeakState.processListenerMonitorInitialized !== true) {
    pylyMemoryLeakState.processListenerMonitorInitialized = true;

    const originalOn = process.on.bind(process);
    const originalAddListener = process.addListener.bind(process);
    const originalPrependListener = process.prependListener.bind(process);

    const traceProcessListenerAdd = (
      method: `on` | `addListener` | `prependListener`,
      event: string | symbol,
    ) => {
      if (event !== `exit` && event !== `beforeExit`) {
        return;
      }

      const stack = new Error().stack ?? `<stack unavailable>`;
      const processListenerAddStackCount =
        pylyMemoryLeakState.processListenerAddStackCount ??
        (pylyMemoryLeakState.processListenerAddStackCount = {});
      const stackKey = `${method}\n${String(event)}\n${stack}`;
      const stackCount = (processListenerAddStackCount[stackKey] ?? 0) + 1;
      processListenerAddStackCount[stackKey] = stackCount;

      const listenerCount = process.listenerCount(event);
      const isOverCountThreshold =
        listenerCount > alwaysReportProcessListenerCountThreshold;
      const isDuplicateStack = stackCount > 1;

      if (isOverCountThreshold || isDuplicateStack) {
        console.warn(
          [
            `PROCESS LISTENER ADDED`,
            `  method           : ${method}`,
            `  event            : ${String(event)}`,
            `  listenerCount    : ${listenerCount}`,
            `  duplicateStack   : ${isDuplicateStack}`,
            `  stackOccurrences : ${stackCount}`,
            `  stack :`,
            stack,
          ].join(`\n`),
        );
      }

      maybeWarnOnExcessiveProcessListeners(pylyMemoryLeakState);
    };

    process.on = ((
      event: string | symbol,
      listener: (...args: never[]) => void,
    ) => {
      traceProcessListenerAdd(`on`, event);
      return originalOn(event as never, listener as never);
    }) as typeof process.on;

    process.addListener = ((
      event: string | symbol,
      listener: (...args: never[]) => void,
    ) => {
      traceProcessListenerAdd(`addListener`, event);
      return originalAddListener(event as never, listener as never);
    }) as typeof process.addListener;

    process.prependListener = ((
      event: string | symbol,
      listener: (...args: never[]) => void,
    ) => {
      traceProcessListenerAdd(`prependListener`, event);
      return originalPrependListener(event as never, listener as never);
    }) as typeof process.prependListener;
  }

  maybeWarnOnExcessiveProcessListeners(pylyMemoryLeakState);
}

/**
 * Fixes https://github.com/expo/expo/issues/47938
 */
export function expoUpdatesMemoryLeakMiddleware(): void {
  interface ExpoUpdatesModuleType {
    listeners: Map<string, Set<(...args: any[]) => void>>;
  }
  const ExpoUpdatesModule = (globalThis.expo?.modules?.[`ExpoUpdates`] ??
    globalThis.expo?.modules?.[`expo-updates`]) as
    | ExpoUpdatesModuleType
    | undefined;
  if (ExpoUpdatesModule != null) {
    const listeners = ExpoUpdatesModule.listeners.get(
      `Expo.nativeUpdatesStateChangeEvent`,
    );
    invariant(
      listeners instanceof Set,
      `ExpoUpdates.listeners.get() should return a Set`,
    );
    listeners.clear();
  }
}

export function serverMemoryLoggingMiddleware(): void {
  const pylyMemoryLeakState = (globalThis.__pylyMemoryLeak ??= {});
  const nowMs = Date.now();
  const lastLogAtMs = pylyMemoryLeakState.serverMemoryLastLogAtMs ?? 0;

  if (nowMs - lastLogAtMs < 1000) {
    return;
  }

  pylyMemoryLeakState.serverMemoryLastLogAtMs = nowMs;

  const { heapTotal, heapUsed, rss, external } = process.memoryUsage();

  console.log(
    `${ansi.fgGray}Server memory${ansi.reset} ` +
      `${formatHeapMetric(`heapTotal`, heapTotal)} ` +
      `${formatHeapMetric(`heapUsed`, heapUsed)} ` +
      `${formatHeapMetric(`rss`, rss)} ` +
      `${formatHeapMetric(`external`, external)}`,
  );
}
