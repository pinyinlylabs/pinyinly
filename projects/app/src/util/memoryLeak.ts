interface PylyMemoryLeakState {
  processListenerMonitorInitialized?: boolean;
  processListenerMaxCountSeen?: Record<`exit` | `beforeExit`, number>;
  processListenerAddStackCount?: Record<string, number>;
}

declare global {
  var __pylyMemoryLeak: PylyMemoryLeakState | undefined;
}

const processListenerEvents = [`exit`, `beforeExit`] as const;

const maxAllowedProcessListenerCount = process.getMaxListeners();
const alwaysReportProcessListenerCountThreshold = 10;

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

export function initMemoryLeakDetection(): void {
  if (process.env.NODE_ENV !== `development`) {
    return;
  }

  const pylyMemoryLeakState = (globalThis.__pylyMemoryLeak ??= {});

  if (!pylyMemoryLeakState.processListenerMonitorInitialized) {
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
