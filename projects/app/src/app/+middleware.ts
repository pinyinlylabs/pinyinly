import {
  serverMemoryLoggingMiddleware,
  expoUpdatesMemoryLeakMiddleware,
  processListenerMemoryLeakMiddleware,
} from "@/util/memoryLeak";

const middleware =
  process.env.NODE_ENV === `development`
    ? () => {
        processListenerMemoryLeakMiddleware();
        expoUpdatesMemoryLeakMiddleware();
        serverMemoryLoggingMiddleware();
      }
    : () => {
        // no-op
      };

export default middleware;
