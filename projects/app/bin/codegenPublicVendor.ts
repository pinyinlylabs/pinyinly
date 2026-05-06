import { copyFileIfChanged } from "@pinyinly/lib/fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { projectRoot } from "./util/paths.ts";

const modulesToCopy = {
  [`onnxruntime-web/ort-wasm-simd-threaded.mjs`]: `ort-wasm-simd-threaded.mjs`,
  [`onnxruntime-web/ort-wasm-simd-threaded.wasm`]: `ort-wasm-simd-threaded.wasm`,
};

for (const [module, dest] of Object.entries(modulesToCopy)) {
  const modulePath = fileURLToPath(import.meta.resolve(module));
  const destPath = path.resolve(projectRoot, `public`, `vendor`, dest);

  await copyFileIfChanged(modulePath, destPath);
}
