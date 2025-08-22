#!/usr/bin/env tsx

import { glob, readFile, writeFile } from "@pinyinly/lib/fs";
import { transform } from "../../mdx/src/transformer.ts";
import path from "node:path";
import { mkdir } from "node:fs/promises";

/**
 * Enhanced template that adds proper TypeScript types for precompiled components
 */
function getTypedTemplate(rawMdxString: string): string {
  return (
    // Add @ts-nocheck to skip TypeScript validation for generated files
    `// @ts-nocheck\n` +
    rawMdxString
      // Replace the function signature to include proper types
      .replace(
        /function _createMdxContent\(props\)/,
        `function _createMdxContent(props: any)`
      )
      // Replace the default export to include proper types  
      .replace(
        /export default function MDXContent\(props = \{\}\)/,
        `export default function MDXContent(props: any = {})`
      )
  );
}

/**
 * Precompile all wiki MDX files to TSX files
 * This avoids runtime compilation during builds and tests
 */
async function precompileWikiMdx() {
  console.log("🔄 Starting wiki MDX precompilation...");
  
  const startTime = Date.now();
  
  // Find all MDX files in the src directory
  const mdxFiles = await glob(
    path.join(process.cwd(), "src/**/*.mdx")
  );
  
  console.log(`📄 Found ${mdxFiles.length} MDX files to precompile`);
  
  let compiled = 0;
  let errors = 0;
  
  for (const mdxFile of mdxFiles) {
    try {
      // Read the MDX file
      const mdxContent = await readFile(mdxFile, "utf-8");
      
      // Transform it to TSX
      const { src: rawTsxContent } = await transform({
        filename: mdxFile,
        src: mdxContent,
      });
      
      // Apply additional typing for precompiled components
      const tsxContent = getTypedTemplate(rawTsxContent);
      
      // Generate the corresponding TSX file path
      const tsxFile = mdxFile.replace(/\.mdx$/, ".tsx");
      
      // Ensure the directory exists
      await mkdir(path.dirname(tsxFile), { recursive: true });
      
      // Write the TSX file
      await writeFile(tsxFile, tsxContent, "utf-8");
      
      compiled++;
      
      if (compiled % 100 === 0) {
        console.log(`✅ Compiled ${compiled}/${mdxFiles.length} files...`);
      }
    } catch (error) {
      console.error(`❌ Error compiling ${mdxFile}:`, error);
      errors++;
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`\n🎉 Precompilation complete!`);
  console.log(`   ✅ Compiled: ${compiled} files`);
  console.log(`   ❌ Errors: ${errors} files`);
  console.log(`   ⏱️  Duration: ${duration}ms`);
  
  if (errors > 0) {
    process.exit(1);
  }
}

// Run the precompilation
precompileWikiMdx().catch((error) => {
  console.error("💥 Precompilation failed:", error);
  process.exit(1);
});