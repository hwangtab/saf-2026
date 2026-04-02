#!/usr/bin/env python3

import argparse
import json
import sys
import time
from pathlib import Path

import cv2
from cv2 import dnn_superres


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Batch artwork image upscaler")
    parser.add_argument("--manifest", required=True, help="Path to input manifest JSON")
    parser.add_argument("--model", required=True, help="Path to OpenCV super-resolution model")
    parser.add_argument("--model-name", default="fsrcnn", help="Model name for OpenCV dnn_superres")
    parser.add_argument("--scale", type=int, default=4, help="Upscale factor declared by the model")
    parser.add_argument(
        "--second-pass-cutoff",
        type=int,
        default=900,
        help="Run a second AI pass when the first-pass long edge stays below this cutoff",
    )
    parser.add_argument(
        "--force-double-pass-below",
        type=int,
        default=225,
        help="Always run two AI passes when the source long edge is below this size",
    )
    return parser.parse_args()


def upscale_one(
    sr: dnn_superres.DnnSuperResImpl,
    item: dict,
    second_pass_cutoff: int,
    force_double_pass_below: int,
) -> dict:
    input_path = Path(item["input_path"])
    output_path = Path(item["output_path"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Failed to read input image: {input_path}")

    source_height, source_width = image.shape[:2]
    source_long_edge = max(source_width, source_height)
    started_at = time.time()

    upscaled = sr.upsample(image)
    passes = 1
    first_height, first_width = upscaled.shape[:2]
    first_long_edge = max(first_width, first_height)

    if source_long_edge < force_double_pass_below or first_long_edge < second_pass_cutoff:
        upscaled = sr.upsample(upscaled)
        passes = 2

    if not cv2.imwrite(str(output_path), upscaled):
        raise RuntimeError(f"Failed to write output image: {output_path}")

    output_height, output_width = upscaled.shape[:2]
    return {
        "id": item["id"],
        "input_path": str(input_path),
        "output_path": str(output_path),
        "source_width": source_width,
        "source_height": source_height,
        "first_pass_width": first_width,
        "first_pass_height": first_height,
        "output_width": output_width,
        "output_height": output_height,
        "passes": passes,
        "seconds": round(time.time() - started_at, 4),
    }


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest)

    with manifest_path.open("r", encoding="utf-8") as fh:
      items = json.load(fh)

    sr = dnn_superres.DnnSuperResImpl_create()
    sr.readModel(str(args.model))
    sr.setModel(args.model_name, args.scale)

    results = []
    failures = []

    for item in items:
        try:
            results.append(
                upscale_one(
                    sr,
                    item,
                    second_pass_cutoff=args.second_pass_cutoff,
                    force_double_pass_below=args.force_double_pass_below,
                )
            )
        except Exception as error:  # noqa: BLE001
            failures.append(
                {
                    "id": item.get("id"),
                    "input_path": item.get("input_path"),
                    "output_path": item.get("output_path"),
                    "error": str(error),
                }
            )

    payload = {"results": results, "failures": failures}
    print(json.dumps(payload, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
