import { initMemoryLeakDetection } from "@/util/memoryLeak";

export default function middleware() {
  initMemoryLeakDetection();
}
