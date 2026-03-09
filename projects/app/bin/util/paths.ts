import path from "node:path";

export const projectRoot = path.resolve(import.meta.dirname, `../..`);
export const workspaceRoot = path.resolve(projectRoot, `../..`);
export const wikiDir = path.join(projectRoot, `src/client/wiki`);
export const dataDir = path.join(projectRoot, `src/data`);
export const dictionaryFilePath = path.join(dataDir, `dictionary.asset.json`);
export const pinyinAudioDir = path.join(projectRoot, `src/assets/audio/pinyin`);
