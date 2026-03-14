#!/usr/bin/env python3
"""
SAF 2026 Video TTS Generator
Generates Korean voiceover audio files from video-config.json using edge-tts.
Outputs MP3 files and a timings.json for Remotion subtitle sync.
"""

import asyncio
import json
import os
import sys
import re

import edge_tts

# Korean voice options:
# ko-KR-SunHiNeural (female, warm, natural)
# ko-KR-InJoonNeural (male, clear)
VOICE = "ko-KR-InJoonNeural"
RATE = "+0%"   # Speed: -10% slower, +10% faster
PITCH = "+0Hz"  # Pitch: -5Hz lower, +5Hz higher
VOLUME = "+0%"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CONFIG_PATH = os.path.join(PROJECT_DIR, "video-config.json")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "public", "voices")


def split_sentences(text: str) -> list[str]:
    """Split Korean text into sentences for subtitle chunking."""
    # Split on sentence-ending punctuation
    parts = re.split(r'(?<=[.!?。])\s*', text.strip())
    return [p.strip() for p in parts if p.strip()]


async def generate_scene_audio(
    scene_id: str, narration: str, output_dir: str,
    voice: str = None, rate: str = None, pitch: str = None
) -> dict:
    """Generate TTS audio for a single scene and extract subtitle timings."""
    mp3_path = os.path.join(output_dir, f"{scene_id}.mp3")

    scene_voice = voice or VOICE
    scene_rate = rate or RATE
    scene_pitch = pitch or PITCH
    communicate = edge_tts.Communicate(
        narration, scene_voice, rate=scene_rate, pitch=scene_pitch, volume=VOLUME
    )

    subtitles = []
    audio_chunks = []

    # Collect audio and subtitle boundaries
    # Korean TTS returns SentenceBoundary (not WordBoundary)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
        elif chunk["type"] in ("SentenceBoundary", "WordBoundary"):
            subtitles.append({
                "text": chunk["text"],
                "startMs": chunk["offset"] // 10000,  # Convert 100ns ticks to ms
                "endMs": (chunk["offset"] + chunk["duration"]) // 10000,
            })

    # Write audio file
    with open(mp3_path, "wb") as f:
        for audio_data in audio_chunks:
            f.write(audio_data)

    # Korean uses SentenceBoundary which already gives sentence-level chunks.
    # Use them directly as subtitles.
    final_subtitles = subtitles if subtitles else []

    # Calculate duration from the last subtitle entry
    duration_ms = 0
    if final_subtitles:
        duration_ms = final_subtitles[-1]["endMs"] + 500  # Add 500ms padding

    voice_label = f" [{scene_voice}]" if voice else ""
    rate_label = f" rate={scene_rate}" if rate else ""
    print(f"  ✓ {scene_id}: {duration_ms/1000:.1f}s{voice_label}{rate_label} → {mp3_path}")

    return {
        "sceneId": scene_id,
        "audioFile": f"voices/{scene_id}.mp3",
        "durationMs": duration_ms,
        "subtitles": final_subtitles,
    }


def merge_subtitles_to_sentences(
    word_boundaries: list[dict], sentences: list[str]
) -> list[dict]:
    """Merge word-level boundaries into sentence-level subtitles."""
    if not word_boundaries:
        return []

    merged = []
    word_idx = 0
    total_words = len(word_boundaries)

    for sentence in sentences:
        if word_idx >= total_words:
            break

        # Find word boundaries that belong to this sentence
        sentence_start = word_boundaries[word_idx]["startMs"]
        sentence_end = word_boundaries[word_idx]["endMs"]

        # Advance through words that are part of this sentence
        sentence_lower = sentence.lower().replace(" ", "")
        matched_text = ""

        start_idx = word_idx
        while word_idx < total_words:
            word_text = word_boundaries[word_idx]["text"]
            matched_text += word_text.lower().replace(" ", "")
            sentence_end = word_boundaries[word_idx]["endMs"]
            word_idx += 1

            # Check if we've roughly matched the sentence
            if len(matched_text) >= len(sentence_lower) * 0.7:
                break

        merged.append({
            "text": sentence,
            "startMs": sentence_start,
            "endMs": sentence_end,
        })

    return merged


async def main():
    print("🎙️ SAF 2026 TTS Generator")
    print(f"   Voice: {VOICE}")
    print(f"   Config: {CONFIG_PATH}")
    print(f"   Default pitch: {PITCH}")
    print()

    # Load config
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate audio for each scene
    timings = []
    for scene in config["scenes"]:
        narration = scene.get("narration", "")
        if not narration:
            # For scenes without narration (intro/outro), just record duration
            duration_s = scene.get("durationInSeconds", 4)
            timings.append({
                "sceneId": scene["id"],
                "audioFile": "",
                "durationMs": int(duration_s * 1000),
                "subtitles": [],
            })
            print(f"  ○ {scene['id']}: {duration_s}s (no narration)")
            continue

        scene_voice = scene.get("voice", None)
        scene_rate = scene.get("rate", None)
        scene_pitch = scene.get("pitch", None)
        timing = await generate_scene_audio(
            scene["id"], narration, OUTPUT_DIR,
            voice=scene_voice, rate=scene_rate, pitch=scene_pitch
        )
        timings.append(timing)

    # Write timings file
    timings_path = os.path.join(OUTPUT_DIR, "timings.json")
    with open(timings_path, "w", encoding="utf-8") as f:
        json.dump(timings, f, ensure_ascii=False, indent=2)

    total_duration = sum(t["durationMs"] for t in timings) / 1000
    print(f"\n✅ Done! Total duration: {total_duration:.1f}s ({total_duration/60:.1f}min)")
    print(f"   Audio files: {OUTPUT_DIR}/")
    print(f"   Timings: {timings_path}")


if __name__ == "__main__":
    asyncio.run(main())
