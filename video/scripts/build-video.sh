#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"

cd "$PROJECT_DIR"

# Parse --config argument (optional: path to alternate config file)
CONFIG_PATH=""
CONFIG_NAME="flagship"
for arg in "$@"; do
    case "$arg" in
        --config=*)
            CONFIG_PATH="${arg#*=}"
            CONFIG_NAME=$(basename "$CONFIG_PATH" .json)
            ;;
    esac
done

echo "🎬 SAF 2026 Video Build Pipeline"
echo "================================="
if [ -n "$CONFIG_PATH" ]; then
    echo "   Config: $CONFIG_PATH"
else
    echo "   Config: video-config.json (default)"
fi
echo ""

# Step 1: Generate TTS audio
echo "📢 Step 1/3: Generating Korean voiceover..."
source "$VENV_DIR/bin/activate"
if [ -n "$CONFIG_PATH" ]; then
    # Backup original, swap in alternate config
    cp video-config.json video-config.json.bak
    cp "$CONFIG_PATH" video-config.json
fi
python3 scripts/generate-tts.py
deactivate
echo ""

# Step 2: Verify files
echo "📋 Step 2/3: Verifying generated files..."
AUDIO_COUNT=$(ls public/voices/*.mp3 2>/dev/null | wc -l | tr -d ' ')
echo "   Audio files: $AUDIO_COUNT"

if [ ! -f "public/voices/timings.json" ]; then
    echo "   ❌ timings.json not found!"
    exit 1
fi
echo "   ✓ timings.json exists"
echo ""

# Step 3: Render video
OUTPUT_FILE="out/saf-2026-${CONFIG_NAME}.mp4"
echo "🎥 Step 3/3: Rendering video with Remotion..."
npx remotion render src/index.ts Video "$OUTPUT_FILE" --codec h264

# Restore original config if we swapped it
if [ -f "video-config.json.bak" ]; then
    mv video-config.json.bak video-config.json
fi

echo ""
echo "================================="
echo "✅ Video generated successfully!"
echo "   Output: $PROJECT_DIR/$OUTPUT_FILE"
echo ""
echo "📺 To preview in Remotion Studio:"
echo "   cd video && npm run studio"
