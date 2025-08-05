# Rules Feature for expo-audio-sprites

## Overview

Added a comprehensive rules-based configuration system for audio sprite generation that allows
declarative file assignment to sprites using regex patterns and glob file inclusion.

## Features

### 1. Rules System

- **Regex Matching**: Use regex patterns to match file paths
- **Template Substitution**: Use capture groups for dynamic sprite naming
- **Flexible Assignment**: Multiple rules for complex file organization

### 2. Include Patterns

- **Glob Support**: Specify which files to scan using glob patterns
- **Multiple Patterns**: Support for multiple include patterns
- **Filesystem Scanning**: Automatic file discovery based on patterns

### 3. Sprite Generation

- **Content-Based Hashing**: Deterministic sprite filenames based on file content
- **Collision Handling**: Multiple files can map to the same sprite
- **Hash Truncation**: 12-character hashes for readable filenames
- **Sorted File Order**: Files within sprites are ordered by path for consistent results

### 4. Audio Timing

- **Frame Alignment**: Start times are aligned to audio sample boundaries (44.1kHz)
- **Buffer Spacing**: 1 second of silence between segments prevents audio bleed
- **Precise Timing**: Accurate duration extraction using FFmpeg analysis

## Configuration

### manifest.json Schema

```json
{
  "spriteFiles": ["sprite-name-abc123def456.m4a"],
  "segments": {
    "audio/file1.m4a": { "sprite": 0, "start": 0, "duration": 1000, "hash": "abc123def456" },
    "audio/file2.m4a": { "sprite": 0, "start": 2000, "duration": 1500, "hash": "789abc012def" }
  },
  "include": ["audio/**/*.m4a", "sounds/**/*.wav"],
  "rules": [
    {
      "match": "audio/(.*)/.*\\.m4a",
      "sprite": "category-$1"
    },
    {
      "match": "sounds/sfx/.*",
      "sprite": "sound-effects"
    }
  ]
}
```

### Rule Types

#### Named Capture Groups

```json
{
  "match": "audio/(?<category>.*)/.*\\.m4a",
  "sprite": "audio-$<category>"
}
```

#### Numbered Capture Groups

```json
{
  "match": "audio/(.*)/(.*)\\.(m4a|wav)",
  "sprite": "$1-$2"
}
```

#### Static Assignment

```json
{
  "match": "effects/.*",
  "sprite": "sound-effects"
}
```

## API Functions

### Core Functions

- `applyRules(filePath, rules)` - Apply rules to determine sprite assignment
- `generateSpriteAssignments(inputFiles, rules)` - Process all files with rules
- `resolveIncludePatterns(patterns, manifestDir)` - Resolve glob patterns to files
- `updateManifestSegments(manifest, manifestPath)` - Update manifest with file assignments
- `saveManifest(manifest, manifestPath)` - Save updated manifest to disk

### Utility Functions

- `getInputFiles(manifest, manifestDir)` - Get all input files from include patterns
- `syncManifestWithFilesystem(manifestPath)` - Sync manifest with filesystem state

## Testing

The feature includes comprehensive test coverage:

- **34 tests** covering all functionality
- **Rule application** with various regex patterns
- **Sprite assignment** with collision handling
- **File system operations** with memfs mocking
- **Hash generation** for deterministic output
- **Error handling** for invalid configurations

Run tests with:

```bash
moon run expo-audio-sprites:test
```

## Integration

### Babel Plugin

The existing Babel transformation automatically works with the new rule-based system:

```javascript
// Input
require('./audio/ui/click.m4a')

// Output (after sprite assignment)
{
  uri: require('./sprites/ui-sounds-abc123def456.m4a'),
  startTime: 0,
  duration: 500
}
```

### Workflow

1. Configure `manifest.json` with include patterns and rules
2. Run `updateManifestSegments()` to scan filesystem and apply rules
3. Build process uses updated manifest for sprite generation
4. Babel plugin transforms require() calls using segment data

## Benefits

- **Declarative Configuration**: No manual file-to-sprite mapping
- **Scalable**: Handles large numbers of audio files efficiently
- **Flexible**: Complex assignment logic through regex patterns
- **Deterministic**: Content-based hashing ensures reproducible builds
- **Type Safe**: Full TypeScript support with Zod validation
- **Well Tested**: Comprehensive test suite ensures reliability

## Example Use Cases

### Organize by Category

```json
{
  "rules": [
    { "match": "audio/ui/.*", "sprite": "ui-sounds" },
    { "match": "audio/music/.*", "sprite": "background-music" },
    { "match": "audio/sfx/.*", "sprite": "sound-effects" }
  ]
}
```

### Dynamic Naming with Capture Groups

```json
{
  "rules": [
    { "match": "audio/(.*)/.*\\.m4a", "sprite": "category-$1" },
    { "match": "locale/(.*)/.*", "sprite": "voice-$1" }
  ]
}
```

### File Type Separation

```json
{
  "rules": [
    { "match": ".*\\.(m4a|mp3)", "sprite": "compressed-audio" },
    { "match": ".*\\.wav", "sprite": "uncompressed-audio" }
  ]
}
```
