# generateWikiSpeech.ts

A command-line tool for generating speech audio files using OpenAI's TTS API for Chinese phrases in the Pinyinly wiki.

## Setup

1. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY='your-api-key-here'
   ```

2. Ensure you have ffmpeg installed (required for M4A conversion):
   ```bash
   # On macOS
   brew install ffmpeg
   
   # On Ubuntu/Debian
   sudo apt-get install ffmpeg
   ```

## Usage

Run the script from the `projects/app` directory:

```bash
# Basic usage - generates audio for all available voices
tsx --tsconfig tsconfig.node.json ./bin/generateWikiSpeech.ts '你好'

# Generate with specific voices only
tsx --tsconfig tsconfig.node.json ./bin/generateWikiSpeech.ts '你好' --voices alloy,nova

# Output to custom directory
tsx --tsconfig tsconfig.node.json ./bin/generateWikiSpeech.ts '你好' --output-dir ./custom-audio

# Generate MP3 instead of M4A
tsx --tsconfig tsconfig.node.json ./bin/generateWikiSpeech.ts '你好' --format mp3

# Adjust speech speed
tsx --tsconfig tsconfig.node.json ./bin/generateWikiSpeech.ts '你好' --speed 1.2
```

## Available Voices

- `alloy` - Neutral, balanced voice
- `echo` - Male voice
- `fable` - British accent
- `onyx` - Deep, resonant voice  
- `nova` - Young, energetic voice
- `shimmer` - Soft, whispery voice

## Output

The script generates audio files with the naming pattern:
`{phrase}-{voice}.{format}`

For example, running with phrase "你好" will create:
- `你好-alloy.m4a`
- `你好-echo.m4a`
- `你好-fable.m4a`
- `你好-onyx.m4a`
- `你好-nova.m4a`
- `你好-shimmer.m4a`

## Integration with Wiki

To place files in the wiki structure, use the output directory option:

```bash
# Generate audio for a character and place in wiki directory
tsx --tsconfig tsconfig.node.json ./bin/generateWikiSpeech.ts '上' --output-dir src/client/wiki/上/
```

Note: You may need to rename the files to match the expected pinyin pattern (e.g., `shang4-alloy.m4a`).

## Error Handling

The script will:
- Check for OpenAI API key before starting
- Generate audio for each voice independently (failures won't stop other voices)
- Attempt M4A conversion but fall back to MP3 if ffmpeg fails
- Provide detailed error messages for troubleshooting