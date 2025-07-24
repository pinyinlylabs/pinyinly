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
  definition?: string;
};

// Read the dictionary.asset.json file
const dictionaryPath = path.resolve(
  __dirname,
  `../src/dictionary/dictionary.asset.json`,
);

// Read and parse the dictionary file
const dictionaryContent = fs.readFileSync(dictionaryPath, `utf8`);
const dictionary = JSON.parse(dictionaryContent) as [string, DictionaryEntry][];

// Process each dictionary entry to remove definition property
for (const item of dictionary) {
  const [, entry] = item;

  // Delete the definition property
  if (entry.definition !== undefined) {
    delete entry.definition;
  }
}

// Write the updated dictionary back to the file
fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2), `utf8`);

console.log(`Dictionary definitions removed successfully!`);
