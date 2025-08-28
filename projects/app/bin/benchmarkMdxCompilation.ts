import { glob, readFile } from "@pinyinly/lib/fs";
import { transform } from "@pinyinly/mdx/transformer";
import makeDebug from "debug";
import path from "node:path";

const debug = makeDebug(`pyly:benchmark`);

/**
 * Benchmark MDX compilation approaches to validate if precompilation is faster
 * than on-the-fly compilation during builds and tests.
 */
async function main() {
  debug(`🏁 Starting MDX compilation benchmark...`);

  // Find all MDX files in the wiki directory
  const mdxFiles = await glob(
    path.join(process.cwd(), `projects/app/src/client/wiki/**/*.mdx`),
  );

  // Take a reasonable sample for benchmarking to avoid long test times
  const sampleSize = Math.min(100, mdxFiles.length);
  const sampleFiles = mdxFiles.slice(0, sampleSize);

  debug(
    `📄 Benchmarking with ${sampleFiles.length} MDX files (sample of ${mdxFiles.length} total)`,
  );

  // Benchmark 1: On-the-fly compilation (simulating current approach)
  debug(`\n🔄 Benchmark 1: On-the-fly compilation`);
  const onTheFlyStart = Date.now();

  let onTheFlySuccess = 0;
  let onTheFlyErrors = 0;

  for (const mdxFile of sampleFiles) {
    try {
      const mdxContent = await readFile(mdxFile, `utf-8`);
      await transform({
        filename: mdxFile,
        src: mdxContent,
      });
      onTheFlySuccess++;
    } catch (error) {
      onTheFlyErrors++;
    }
  }

  const onTheFlyDuration = Date.now() - onTheFlyStart;

  // Benchmark 2: Reading precompiled files (current precompilation approach)
  debug(`\n🔄 Benchmark 2: Reading precompiled .mdx.tsx files`);
  const precompiledStart = Date.now();

  let precompiledSuccess = 0;
  let precompiledErrors = 0;

  for (const mdxFile of sampleFiles) {
    try {
      const compiledFile = mdxFile.replace(/\.mdx$/, `.mdx.tsx`);
      await readFile(compiledFile, `utf-8`);
      precompiledSuccess++;
    } catch (error) {
      precompiledErrors++;
    }
  }

  const precompiledDuration = Date.now() - precompiledStart;

  // Benchmark 3: Precompilation time (one-time cost)
  debug(`\n🔄 Benchmark 3: Precompilation time for sample`);
  const precompilationStart = Date.now();

  let precompilationSuccess = 0;
  let precompilationErrors = 0;

  for (const mdxFile of sampleFiles) {
    try {
      const mdxContent = await readFile(mdxFile, `utf-8`);
      await transform({
        filename: mdxFile,
        src: mdxContent,
      });
      precompilationSuccess++;
    } catch (error) {
      precompilationErrors++;
    }
  }

  const precompilationDuration = Date.now() - precompilationStart;

  // Results
  debug(`\n📊 Benchmark Results:`);
  debug(`\n1. On-the-fly compilation:`);
  debug(`   ⏱️  Duration: ${onTheFlyDuration}ms`);
  debug(`   ✅ Success: ${onTheFlySuccess} files`);
  debug(`   ❌ Errors: ${onTheFlyErrors} files`);
  debug(
    `   📈 Avg per file: ${(onTheFlyDuration / sampleFiles.length).toFixed(2)}ms`,
  );

  debug(`\n2. Reading precompiled files:`);
  debug(`   ⏱️  Duration: ${precompiledDuration}ms`);
  debug(`   ✅ Success: ${precompiledSuccess} files`);
  debug(`   ❌ Errors: ${precompiledErrors} files`);
  debug(
    `   📈 Avg per file: ${(precompiledDuration / sampleFiles.length).toFixed(2)}ms`,
  );

  debug(`\n3. Precompilation time (one-time cost):`);
  debug(`   ⏱️  Duration: ${precompilationDuration}ms`);
  debug(`   ✅ Success: ${precompilationSuccess} files`);
  debug(`   ❌ Errors: ${precompilationErrors} files`);
  debug(
    `   📈 Avg per file: ${(precompilationDuration / sampleFiles.length).toFixed(2)}ms`,
  );

  // Analysis
  const speedupFactor = onTheFlyDuration / precompiledDuration;
  const breakEvenPoint = Math.ceil(
    precompilationDuration / (onTheFlyDuration - precompiledDuration),
  );

  debug(`\n🔍 Analysis:`);
  debug(`   🚀 Speedup factor: ${speedupFactor.toFixed(2)}x faster`);
  debug(`   ⚖️  Break-even point: ${breakEvenPoint} uses of compiled files`);

  if (speedupFactor > 1) {
    debug(
      `   ✅ Precompilation approach is ${speedupFactor.toFixed(2)}x faster for runtime usage`,
    );
  } else {
    debug(`   ⚠️  On-the-fly compilation might be comparable or faster`);
  }

  // Extrapolate to full dataset
  const fullDatasetOnTheFly =
    (onTheFlyDuration / sampleFiles.length) * mdxFiles.length;
  const fullDatasetPrecompiled =
    (precompiledDuration / sampleFiles.length) * mdxFiles.length;
  const fullDatasetPrecompilation =
    (precompilationDuration / sampleFiles.length) * mdxFiles.length;

  debug(`\n📈 Extrapolated to full dataset (${mdxFiles.length} files):`);
  debug(
    `   On-the-fly: ~${Math.round(fullDatasetOnTheFly)}ms (${(fullDatasetOnTheFly / 1000).toFixed(1)}s)`,
  );
  debug(
    `   Precompiled reading: ~${Math.round(fullDatasetPrecompiled)}ms (${(fullDatasetPrecompiled / 1000).toFixed(1)}s)`,
  );
  debug(
    `   Precompilation cost: ~${Math.round(fullDatasetPrecompilation)}ms (${(fullDatasetPrecompilation / 1000).toFixed(1)}s)`,
  );

  const totalSavings = fullDatasetOnTheFly - fullDatasetPrecompiled;
  debug(
    `   💰 Savings per usage: ~${Math.round(totalSavings)}ms (${(totalSavings / 1000).toFixed(1)}s)`,
  );

  debug(`\n🎯 Recommendation:`);
  if (speedupFactor > 2) {
    debug(`   ✅ Precompilation provides significant performance benefit`);
  } else if (speedupFactor > 1.2) {
    debug(`   ✅ Precompilation provides moderate performance benefit`);
  } else {
    debug(`   ⚠️  Performance benefit of precompilation may be minimal`);
  }
}

// Run the benchmark
await main();
