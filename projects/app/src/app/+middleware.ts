import {
  expoRouterServerMemoryLoggingMiddleware,
  expoUpdatesMemoryLeakMiddleware,
  processListenerMemoryLeakMiddleware,
} from "@/util/memoryLeak";

const middleware =
  process.env.NODE_ENV === `development`
    ? () => {
        processListenerMemoryLeakMiddleware();
        expoUpdatesMemoryLeakMiddleware();
        expoRouterServerMemoryLoggingMiddleware();
      }
    : () => {};

export default middleware;
