import { hanziFromHanziWord, loadHsk2HanziWords } from "#dictionary.js";
import makeDebug from "debug";
import yargs from "yargs";
import { loadCompleteHskVocabulary } from "../test/data/completeHskVocabulary.ts";

const debug = makeDebug(`pyly`);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`debug`, {
    type: `boolean`,
    default: false,
  })
  .version(false)
  .strict()
  .parseAsync();

if (argv.debug) {
  makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
}

const completeHskVocabulary = await loadCompleteHskVocabulary();

// console.log(`item 8277 =`, fullHskList[8277]);

console.log(`Loaded ${completeHskVocabulary.length} items`);

const hsk2Items = completeHskVocabulary.filter((item) =>
  item.level.includes(`new-2`),
);

console.log(`HSK 2 has ${hsk2Items.length} items:`);

const hsk2Wordlist = await loadHsk2HanziWords();

const existingHanzi = new Set(
  hsk2Wordlist.map((word) => hanziFromHanziWord(word)),
);
const expectedHanzi = new Set(hsk2Items.map((item) => item.simplified));

console.log(`diff =`, existingHanzi.symmetricDifference(expectedHanzi));

for (const item of hsk2Items) {
  // const hanzi = hanziFromHanziWord(item);
  const wordEntry = hsk2Wordlist.find(
    (word) => hanziFromHanziWord(word) === item.simplified,
  );

  if (wordEntry == null) {
    console.warn(
      `No dictionary entry found for HSK 2 word: ${item.simplified}`,
    );
    continue;
  }
}
