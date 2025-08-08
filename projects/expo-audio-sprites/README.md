# @pinyinly/expo-audio-sprites

A package for efficiently handling audio sprites in Expo applications. Audio sprites combine
multiple small audio files into fewer larger files to reduce the number of HTTP requests and improve
app performance.

## Features

- **Babel transformation**: Automatically transforms `require()` calls for `.m4a` files into audio
  sprite objects
- **Rule-based sprite assignment**: Declaratively specify how audio files should be grouped into
  sprites using regex patterns
- **TypeScript support**: Full type safety with TypeScript definitions
- **Build-time optimization**: Transform audio assets at build time rather than runtime

## Installation

```bash
npm install @pinyinly/expo-audio-sprites
```

## Usage

### Basic Setup

1. Create a `manifest.json` file to describe your audio sprites:

```json
{
  "spriteFiles": ["./sprites/ui-sounds.m4a", "./sprites/wiki-audio.m4a"],
  "segments": {
    "abc123...": [0, 0.0, 1.2],
    "def456...": [1, 1.5, 0.8]
  },
  "rules": [
    {
      "match": "audio/wiki/(?<page>[^/]+)/(?<file>[^/]+)\\.m4a",
      "sprite": "wiki-${page}"
    },
    {
      "match": "audio/ui/(?<sound>[^/]+)\\.m4a",
      "sprite": "ui-sounds"
    }
  ]
}
```

2. Configure your Babel preset:

```javascript
// babel.config.js
module.exports = {
  presets: [
    [
      "@pinyinly/expo-audio-sprites/babel",
      {
        manifestPath: "./src/assets/audio/manifest.json",
      },
    ],
  ],
};
```

3. Use audio files in your code:

```typescript
import { Audio } from "expo-av";

// This will be transformed at build time
const buttonClick = require("./assets/audio/ui/button-click.m4a");
const wikiGreeting = require("./assets/audio/wiki/hello/greeting.m4a");

// Use with expo-av
const { sound } = await Audio.Sound.createAsync(buttonClick);
```

### Rules System

The `rules` field in `manifest.json` allows you to declaratively specify how audio files should be
grouped into sprites:

- **`match`**: A regex pattern that matches file paths relative to the manifest.json file
- **`sprite`**: A template string for the sprite name, which can reference capture groups from the
  regex

#### Named Capture Groups

Use named capture groups with `${groupName}` syntax:

```json
{
  "match": "audio/wiki/(?<page>[^/]+)/(?<file>[^/]+)\\.m4a",
  "sprite": "wiki-${page}"
}
```

This would match files like:

- `audio/wiki/hello/greeting.m4a` → sprite: `wiki-hello`
- `audio/wiki/world/intro.m4a` → sprite: `wiki-world`

#### Numbered Capture Groups

Use numbered groups with `$1`, `$2`, etc.:

```json
{
  "match": "audio/([^/]+)/([^/]+)\\.m4a",
  "sprite": "$1-$2"
}
```

#### Audio Bitrate Control

You can specify a custom bitrate for each rule to control the audio quality and file size of the
generated sprites:

```json
{
  "rules": [
    {
      "include": ["audio/music/**/*.m4a"],
      "match": "audio/music/.*\\.m4a",
      "sprite": "background-music",
      "bitrate": "256k"
    },
    {
      "include": ["audio/sfx/**/*.m4a"],
      "match": "audio/sfx/.*\\.m4a",
      "sprite": "sound-effects",
      "bitrate": "128k"
    }
  ]
}
```

- **`bitrate`**: Optional audio bitrate for the output sprite (e.g., "128k", "192k", "256k")
- If not specified, defaults to "128k"
- Higher bitrates result in better quality but larger file sizes
- Common values: "64k" (low quality), "128k" (standard), "192k" (good), "256k" (high quality)

### Build-time Utilities

The package exports utilities for build tools to process rules:

```typescript
import { applyRules, generateSpriteAssignments } from "@pinyinly/expo-audio-sprites/client";

// Apply rules to a single file
const spriteName = applyRules("audio/wiki/hello/greeting.m4a", rules);

// Generate sprite assignments for multiple files
const files = ["audio/wiki/hello/greeting.m4a", "audio/ui/click.m4a"];
const assignments = generateSpriteAssignments(files, rules);
// Returns: Map { 'wiki-hello' => ['audio/wiki/hello/greeting.m4a'], 'ui-sounds' => ['audio/ui/click.m4a'] }
```

## Manifest Structure

- **`spriteFiles`**: Array of sprite file paths (relative to manifest)
- **`segments`**: Maps file content hashes to sprite data `[spriteIndex, startTime, duration]`
- **`rules`**: Optional array of rules for automatic sprite assignment during build

## How It Works

1. **Build time**: Audio files are processed according to rules and combined into sprite files
2. **Babel transformation**: `require()` calls for `.m4a` files are replaced with sprite objects
3. **Runtime**: Expo Audio plays the correct segment from the sprite file

The transformed code looks like:

```typescript
// Original:
const audio = require("./sounds/beep.m4a");

// Transformed:
const audio = {
  type: "audiosprite",
  start: 1.2,
  duration: 0.5,
  asset: require("./sprites/ui-sounds.m4a"),
};
```

## TypeScript Types

```typescript
interface AudioSpriteSource {
  type: "audiosprite";
  start: number;
  duration: number;
  asset: AudioSource;
}

interface SpriteRule {
  include: string[]; // Glob patterns for input files
  match: string; // Regex pattern
  sprite: string; // Template string
  bitrate?: string; // Optional audio bitrate (defaults to "128k")
}
```
