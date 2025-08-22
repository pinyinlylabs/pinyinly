export { loadManifest } from "./manifestRead.ts";
export {
  applyRules,
  generateSpriteAssignments,
  getInputFiles,
  resolveIncludePatterns,
  saveManifest,
  syncManifestWithFilesystem,
  recomputeManifest as updateManifestSegments,
} from "./manifestWrite.ts";

export { analyzeAudioFile } from "./ffmpeg.ts";
