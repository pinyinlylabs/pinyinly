#!/usr/bin/env tsx

import { glob, readFile, writeFile } from "@pinyinly/lib/fs";
import path from "node:path";

/**
 * Update the wiki registry to import .tsx files instead of .mdx files
 */
async function updateWikiRegistry() {
  console.log("🔄 Updating wiki registry to use .tsx files...");
  
  const wikiFilePath = path.join(process.cwd(), "src/client/wiki.ts");
  let content = await readFile(wikiFilePath, "utf-8");
  
  // Find all TSX files in the wiki directory
  const tsxFiles = await glob(
    path.join(process.cwd(), "src/client/wiki/**/*.tsx")
  );
  
  console.log(`📄 Found ${tsxFiles.length} TSX files`);
  
  // Generate the new registry entries
  const registryEntries = tsxFiles.map(tsxFile => {
    // Get relative path from src/client/
    const relativePath = path.relative(path.join(process.cwd(), "src/client"), tsxFile);
    
    // Get the registry key (remove wiki/ prefix and .tsx extension)
    const registryKey = relativePath.replace(/^wiki\//, "").replace(/\.tsx$/, "");
    
    // Generate the import statement with the full relative path
    return `  "${registryKey}": lazyMdx(() => import(\`./${relativePath}\`)),`;
  }).sort();
  
  // Find the template section and replace it
  const templateStartMarker = "// <pyly-glob-template";
  const templateEndMarker = "// </pyly-glob-template>";
  
  const startIndex = content.indexOf(templateStartMarker);
  const endIndex = content.indexOf(templateEndMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Could not find template markers in wiki.ts");
  }
  
  // Find the end of the template start line
  const templateStartLineEnd = content.indexOf("\n", startIndex);
  
  // Build new content
  const newContent = 
    content.substring(0, templateStartLineEnd + 1) +
    registryEntries.join("\n") + "\n" +
    content.substring(endIndex);
  
  // Write the updated file
  await writeFile(wikiFilePath, newContent, "utf-8");
  
  console.log(`✅ Updated wiki registry with ${registryEntries.length} .tsx imports`);
}

// Run the update
updateWikiRegistry().catch((error) => {
  console.error("💥 Failed to update wiki registry:", error);
  process.exit(1);
});