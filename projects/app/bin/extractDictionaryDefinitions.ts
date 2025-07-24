import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for the dictionary entry
type DictionaryEntry = {
  gloss: string[];
  pinyin: string[];
  example?: string;
  partOfSpeech: string;
  definition: string;
};

// Read the dictionary.asset.json file
const dictionaryPath = path.resolve(
  __dirname,
  `../src/dictionary/dictionary.asset.json`,
);
const wikiBasePath = path.resolve(__dirname, `../src/client/wiki`);

// Ensure the wiki base directory exists
if (!fs.existsSync(wikiBasePath)) {
  fs.mkdirSync(wikiBasePath, { recursive: true });
}

// Read and parse the dictionary file
const dictionaryContent = fs.readFileSync(dictionaryPath, `utf8`);
const dictionary = JSON.parse(dictionaryContent) as [string, DictionaryEntry][];

// Process each dictionary entry
for (const item of dictionary) {
  const [key, entry] = item;

  if (entry.definition === ``) {
    console.log(`Skipping "${key}" as it has no definition`);
    continue;
  }

  // Extract character and tag from the key (format: "character:tag")
  // Need to handle the fact that the key is literally stored with the : character
  const colonIndex = key.indexOf(`:`);
  if (colonIndex === -1) {
    console.log(`Invalid key format: "${key}" (missing :)`);
    continue;
  }

  const character = key.slice(0, colonIndex);
  const tag = key.slice(colonIndex + 1);

  if (character !== `` && tag !== ``) {
    // Create the directory path
    const definitionDir = path.join(wikiBasePath, character, `~${tag}`);

    // Create the directory structure if it doesn't exist
    fs.mkdirSync(definitionDir, { recursive: true });

    // Create the meaning.mdx file
    const mdxFilePath = path.join(definitionDir, `meaning.mdx`);
    fs.writeFileSync(mdxFilePath, entry.definition);

    console.log(`Created: ${mdxFilePath}`);
  } else {
    console.log(
      `Invalid key format: "${key}" colonIndex=${colonIndex} character=${character} tag=${tag}`,
    );
  }
}

console.log(`Dictionary definitions extraction complete!`);
