#!/usr/bin/env python3
"""
Build initial Cafe24 mapping artifacts from existing bulk-upload CSV files.

Outputs:
  - master-products.csv: merged + deduplicated source rows
  - initial-mapping.csv: core mapping table for backfill/sync jobs
  - image-manifest.csv: per-image resolution manifest for API uploads
  - missing-images.csv: unresolved image references only
  - duplicate-codes.csv: duplicate custom code diagnostics
  - summary.json: run summary and quality stats
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

DEFAULT_INPUT_GLOB = "docs/cafe24-products-*.csv"
DEFAULT_IMAGE_DIR = "public/images/artworks"
DEFAULT_OUTPUT_DIR = "docs/cafe24-mapping"

COL_CUSTOM_CODE = "자체 상품코드"
COL_PRODUCT_NAME = "상품명"
COL_DESCRIPTION = "상품 상세설명"
COL_PRICE = "판매가"
COL_TAX = "과세구분"
COL_PRICE_REPLACEMENT_ENABLED = "판매가 대체문구 사용"
COL_PRICE_REPLACEMENT_TEXT = "판매가 대체문구"

IMAGE_COLUMNS: List[Tuple[str, str]] = [
    ("이미지등록(상세)", "detail"),
    ("이미지등록(목록)", "list"),
    ("이미지등록(작은목록)", "tiny"),
    ("이미지등록(축소)", "small"),
]

REQUIRED_COLUMNS = [COL_CUSTOM_CODE, COL_PRODUCT_NAME, COL_DESCRIPTION, COL_PRICE, COL_TAX]


@dataclass
class ImageResolution:
    reference: str
    resolved_filename: str
    resolved_path: str
    exists: str
    used_fallback: str
    reason: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build initial Cafe24 mapping artifacts.")
    parser.add_argument("--input-glob", default=DEFAULT_INPUT_GLOB)
    parser.add_argument("--image-dir", default=DEFAULT_IMAGE_DIR)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def parse_artwork_numeric_id(custom_code: str) -> str:
    match = re.fullmatch(r"SAF2026-(\d+)", custom_code.strip())
    if not match:
        return ""
    return str(int(match.group(1)))


def sort_key_for_custom_code(custom_code: str) -> Tuple[int, str]:
    numeric_id = parse_artwork_numeric_id(custom_code)
    if not numeric_id:
        return (10**9, custom_code)
    return (int(numeric_id), custom_code)


def sanitize_row(row: Dict[str, str]) -> Dict[str, str]:
    return {str(key): (value or "").strip() for key, value in row.items()}


def discover_csv_paths(pattern: str) -> List[Path]:
    paths = sorted(Path(".").glob(pattern))
    return [path for path in paths if path.is_file()]


def load_rows(csv_paths: Iterable[Path]) -> Tuple[List[str], List[Dict[str, str]], List[str], List[Tuple[str, int]]]:
    merged_rows: List[Dict[str, str]] = []
    header: List[str] = []
    header_mismatch_files: List[str] = []
    empty_code_rows: List[Tuple[str, int]] = []

    for csv_path in csv_paths:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            if not reader.fieldnames:
                continue

            current_header = [field.strip() if field else "" for field in reader.fieldnames]
            if not header:
                header = current_header
            elif current_header != header:
                header_mismatch_files.append(csv_path.name)

            for line_no, raw_row in enumerate(reader, start=2):
                row = sanitize_row(raw_row)
                custom_code = row.get(COL_CUSTOM_CODE, "")
                if not custom_code:
                    empty_code_rows.append((csv_path.name, line_no))
                    continue
                row["_source_file"] = csv_path.name
                row["_source_line"] = str(line_no)
                merged_rows.append(row)

    return header, merged_rows, header_mismatch_files, empty_code_rows


def deduplicate_rows(rows: Iterable[Dict[str, str]]) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    deduped: Dict[str, Dict[str, str]] = {}
    duplicates: List[Dict[str, str]] = []

    for row in rows:
        custom_code = row.get(COL_CUSTOM_CODE, "")
        if not custom_code:
            continue
        if custom_code in deduped:
            previous = deduped[custom_code]
            duplicates.append(
                {
                    "custom_product_code": custom_code,
                    "kept_source_file": previous.get("_source_file", ""),
                    "kept_source_line": previous.get("_source_line", ""),
                    "replaced_source_file": row.get("_source_file", ""),
                    "replaced_source_line": row.get("_source_line", ""),
                }
            )
        deduped[custom_code] = row

    sorted_rows = sorted(deduped.values(), key=lambda item: sort_key_for_custom_code(item[COL_CUSTOM_CODE]))
    return sorted_rows, duplicates


def build_image_inventory(image_dir: Path) -> Tuple[Dict[str, str], Dict[str, List[str]]]:
    by_lower_name: Dict[str, str] = {}
    by_stem: Dict[str, List[str]] = {}

    if not image_dir.exists():
        return by_lower_name, by_stem

    for file_path in image_dir.iterdir():
        if not file_path.is_file():
            continue
        filename = file_path.name
        by_lower_name[filename.lower()] = filename
        stem = file_path.stem.lower()
        by_stem.setdefault(stem, []).append(filename)

    for stem, names in by_stem.items():
        by_stem[stem] = sorted(names, key=lambda name: preferred_extension_sort_key(name, ""))

    return by_lower_name, by_stem


def preferred_extension_sort_key(filename: str, preferred_ext: str) -> Tuple[int, str]:
    ext = Path(filename).suffix.lower()
    priority = [preferred_ext, ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]
    try:
        rank = priority.index(ext)
    except ValueError:
        rank = len(priority)
    return (rank, filename.lower())


def resolve_image_reference(
    reference: str,
    image_dir: Path,
    by_lower_name: Dict[str, str],
    by_stem: Dict[str, List[str]],
    fallback_stem: str = "",
) -> ImageResolution:
    clean_ref = reference.strip()
    clean_fallback_stem = fallback_stem.strip().lower()

    if not clean_ref and clean_fallback_stem:
        candidates = by_stem.get(clean_fallback_stem, [])
        if candidates:
            selected = sorted(candidates, key=lambda name: preferred_extension_sort_key(name, ""))[0]
            return ImageResolution(
                reference="",
                resolved_filename=selected,
                resolved_path=str((image_dir / selected).as_posix()),
                exists="Y",
                used_fallback="Y",
                reason="empty_reference_stem_fallback",
            )

    if not clean_ref:
        return ImageResolution(
            reference="",
            resolved_filename="",
            resolved_path="",
            exists="N",
            used_fallback="N",
            reason="empty",
        )

    exact_filename = by_lower_name.get(clean_ref.lower())
    if exact_filename:
        return ImageResolution(
            reference=clean_ref,
            resolved_filename=exact_filename,
            resolved_path=str((image_dir / exact_filename).as_posix()),
            exists="Y",
            used_fallback="N",
            reason="exact",
        )

    preferred_ext = Path(clean_ref).suffix.lower()
    stem = Path(clean_ref).stem.lower()
    candidates = by_stem.get(stem, [])

    if candidates:
        selected = sorted(candidates, key=lambda name: preferred_extension_sort_key(name, preferred_ext))[0]
        return ImageResolution(
            reference=clean_ref,
            resolved_filename=selected,
            resolved_path=str((image_dir / selected).as_posix()),
            exists="Y",
            used_fallback="Y",
            reason="extension_fallback",
        )

    return ImageResolution(
        reference=clean_ref,
        resolved_filename="",
        resolved_path="",
        exists="N",
        used_fallback="N",
        reason="not_found",
    )


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_csv(path: Path, headers: List[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore", quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    args = parse_args()
    input_glob = args.input_glob
    image_dir = Path(args.image_dir)
    output_dir = Path(args.output_dir)

    csv_paths = discover_csv_paths(input_glob)
    if not csv_paths:
        raise SystemExit(f"No CSV files matched pattern: {input_glob}")

    header, raw_rows, header_mismatch_files, empty_code_rows = load_rows(csv_paths)
    deduped_rows, duplicate_rows = deduplicate_rows(raw_rows)
    by_lower_name, by_stem = build_image_inventory(image_dir)

    ensure_output_dir(output_dir)

    master_rows: List[Dict[str, str]] = []
    mapping_rows: List[Dict[str, str]] = []
    image_manifest_rows: List[Dict[str, str]] = []
    missing_images_rows: List[Dict[str, str]] = []

    missing_required_counter: Counter[str] = Counter()
    ready_count = 0
    fallback_image_count = 0

    for row in deduped_rows:
        custom_code = row[COL_CUSTOM_CODE]
        artwork_numeric_id = parse_artwork_numeric_id(custom_code)

        missing_required = [column for column in REQUIRED_COLUMNS if not row.get(column, "")]
        for column in missing_required:
            missing_required_counter[column] += 1

        resolved_by_alias: Dict[str, ImageResolution] = {}
        unresolved_image_count = 0

        for column_name, alias in IMAGE_COLUMNS:
            resolution = resolve_image_reference(
                row.get(column_name, ""),
                image_dir=image_dir,
                by_lower_name=by_lower_name,
                by_stem=by_stem,
                fallback_stem=artwork_numeric_id,
            )
            resolved_by_alias[alias] = resolution

            if resolution.used_fallback == "Y":
                fallback_image_count += 1

            # Detail image is mandatory for API-ready 판단.
            is_missing_for_ready = resolution.exists == "N" and (bool(resolution.reference) or alias == "detail")
            if is_missing_for_ready:
                unresolved_image_count += 1
                missing_images_rows.append(
                    {
                        "custom_product_code": custom_code,
                        "artwork_numeric_id": artwork_numeric_id,
                        "image_type": alias,
                        "image_column": column_name,
                        "image_reference": resolution.reference or "<empty>",
                        "source_file": row.get("_source_file", ""),
                        "source_line": row.get("_source_line", ""),
                        "reason": resolution.reason,
                    }
                )

            image_manifest_rows.append(
                {
                    "custom_product_code": custom_code,
                    "artwork_numeric_id": artwork_numeric_id,
                    "source_file": row.get("_source_file", ""),
                    "source_line": row.get("_source_line", ""),
                    "image_type": alias,
                    "image_column": column_name,
                    "image_reference": resolution.reference,
                    "resolved_image_filename": resolution.resolved_filename,
                    "resolved_image_path": resolution.resolved_path,
                    "exists": resolution.exists,
                    "used_fallback": resolution.used_fallback,
                    "reason": resolution.reason,
                }
            )

        ready_for_api = "Y" if not missing_required and unresolved_image_count == 0 else "N"
        if ready_for_api == "Y":
            ready_count += 1

        master_row = dict(row)
        master_row["_artwork_numeric_id"] = artwork_numeric_id
        master_row["_missing_required_columns"] = ",".join(missing_required)
        master_row["_unresolved_image_count"] = str(unresolved_image_count)
        master_row["_ready_for_api"] = ready_for_api

        for _, alias in IMAGE_COLUMNS:
            resolution = resolved_by_alias[alias]
            master_row[f"_image_{alias}_resolved"] = resolution.resolved_filename
            master_row[f"_image_{alias}_exists"] = resolution.exists
            master_row[f"_image_{alias}_used_fallback"] = resolution.used_fallback

        master_rows.append(master_row)

        mapping_rows.append(
            {
                "custom_product_code": custom_code,
                "artwork_numeric_id": artwork_numeric_id,
                "product_name": row.get(COL_PRODUCT_NAME, ""),
                "tax_type": row.get(COL_TAX, ""),
                "price": row.get(COL_PRICE, ""),
                "price_replacement_enabled": row.get(COL_PRICE_REPLACEMENT_ENABLED, ""),
                "price_replacement_text": row.get(COL_PRICE_REPLACEMENT_TEXT, ""),
                "source_file": row.get("_source_file", ""),
                "source_line": row.get("_source_line", ""),
                "detail_image_reference": row.get("이미지등록(상세)", ""),
                "detail_image_resolved": resolved_by_alias["detail"].resolved_filename,
                "missing_required_columns": ",".join(missing_required),
                "unresolved_image_count": str(unresolved_image_count),
                "ready_for_api": ready_for_api,
            }
        )

    master_headers = (
        header
        + [
            "_source_file",
            "_source_line",
            "_artwork_numeric_id",
            "_missing_required_columns",
            "_unresolved_image_count",
            "_ready_for_api",
        ]
        + [f"_image_{alias}_resolved" for _, alias in IMAGE_COLUMNS]
        + [f"_image_{alias}_exists" for _, alias in IMAGE_COLUMNS]
        + [f"_image_{alias}_used_fallback" for _, alias in IMAGE_COLUMNS]
    )
    mapping_headers = [
        "custom_product_code",
        "artwork_numeric_id",
        "product_name",
        "tax_type",
        "price",
        "price_replacement_enabled",
        "price_replacement_text",
        "source_file",
        "source_line",
        "detail_image_reference",
        "detail_image_resolved",
        "missing_required_columns",
        "unresolved_image_count",
        "ready_for_api",
    ]
    manifest_headers = [
        "custom_product_code",
        "artwork_numeric_id",
        "source_file",
        "source_line",
        "image_type",
        "image_column",
        "image_reference",
        "resolved_image_filename",
        "resolved_image_path",
        "exists",
        "used_fallback",
        "reason",
    ]
    missing_headers = [
        "custom_product_code",
        "artwork_numeric_id",
        "image_type",
        "image_column",
        "image_reference",
        "source_file",
        "source_line",
        "reason",
    ]
    duplicate_headers = [
        "custom_product_code",
        "kept_source_file",
        "kept_source_line",
        "replaced_source_file",
        "replaced_source_line",
    ]

    write_csv(output_dir / "master-products.csv", master_headers, master_rows)
    write_csv(output_dir / "initial-mapping.csv", mapping_headers, mapping_rows)
    write_csv(output_dir / "image-manifest.csv", manifest_headers, image_manifest_rows)
    write_csv(output_dir / "missing-images.csv", missing_headers, missing_images_rows)
    write_csv(output_dir / "duplicate-codes.csv", duplicate_headers, duplicate_rows)

    summary = {
        "input": {
            "input_glob": input_glob,
            "csv_files": [path.as_posix() for path in csv_paths],
            "image_dir": image_dir.as_posix(),
            "output_dir": output_dir.as_posix(),
        },
        "counts": {
            "raw_rows": len(raw_rows),
            "deduplicated_rows": len(deduped_rows),
            "duplicate_code_rows": len(duplicate_rows),
            "empty_custom_code_rows": len(empty_code_rows),
            "image_manifest_rows": len(image_manifest_rows),
            "missing_image_rows": len(missing_images_rows),
            "ready_for_api_rows": ready_count,
            "fallback_image_resolutions": fallback_image_count,
        },
        "quality": {
            "header_mismatch_files": header_mismatch_files,
            "missing_required_columns": dict(missing_required_counter),
            "empty_custom_code_rows": [
                {"source_file": source_file, "source_line": source_line}
                for source_file, source_line in empty_code_rows
            ],
        },
    }

    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[cafe24] csv files: {len(csv_paths)}")
    print(f"[cafe24] rows(raw/dedup): {len(raw_rows)}/{len(deduped_rows)}")
    print(f"[cafe24] ready_for_api: {ready_count}")
    print(f"[cafe24] missing_images: {len(missing_images_rows)}")
    print(f"[cafe24] output: {output_dir.as_posix()}")


if __name__ == "__main__":
    main()
