# File Naming Standards

## Overview

This document establishes file naming conventions for all assets in the SAF 2026 website to ensure cross-platform compatibility, prevent encoding issues, and maintain consistency across the codebase.

## Standard Rules

### ✅ Allowed Characters

- **Lowercase letters**: `a-z`
- **Numbers**: `0-9`
- **Hyphens**: `-` (preferred for word separation)
- **Underscores**: `_` (acceptable for word separation)

### ❌ Avoid

- **Non-ASCII characters**: Korean, Japanese, Chinese, accented characters, etc.
- **Spaces**: Use hyphens or underscores instead
- **Special characters**: `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, etc.
- **Uppercase letters**: Use lowercase for consistency

## Examples

### Images

**Good** ✅

```
artist-kim-minsu-artwork-2023.webp
exhibition-hall-photo-01.jpg
saf2023-opening-ceremony.png
```

**Avoid** ❌

```
작가명-작품명.webp
Artist Name Photo.jpg
SAF2023_김민수.webp
```

### Documents

**Good** ✅

```
price-list-2023.pdf
application-form-artist.docx
event-schedule-march.pdf
```

**Avoid** ❌

```
가격표 2023.pdf
신청서(예술인).docx
3월 행사일정.pdf
```

## Migration Strategy

### Existing Files

Currently, artwork files in `public/images/saf2023/ART/` use Korean filenames. These files are:

- **Status**: Working fine in current environment
- **Risk**: Potential encoding issues in some OS/server/CDN environments
- **Strategy**: Gradual migration recommended

### Migration Steps

1. **For new files**: Apply naming standards from day one
2. **For existing files**:
   - Low priority - migrate when convenient
   - Update code references in `content/saf2023-photos.ts` after renaming
   - Test thoroughly before deployment

### Romanization Guide

For Korean names, use one of these approaches:

**Option 1: Revised Romanization** (Recommended)

```
김민수 → kim-minsu
씨앗페 → siatpe or seed-art-festival
```

**Option 2: Descriptive English**

```
작품명 → artwork-title or piece-name
전시장 → exhibition-hall
```

## Benefits

✅ **Cross-platform compatibility**: Works on Windows, Mac, Linux, and all web servers
✅ **URL-friendly**: Clean, readable URLs without encoding
✅ **Git-friendly**: Prevents commit conflicts due to encoding differences
✅ **CDN-friendly**: Reduces potential issues with content delivery networks
✅ **Developer-friendly**: Easier to type and reference in code

## When to Deviate

In rare cases where Korean filenames are absolutely necessary (e.g., for internal documents not served via web), ensure:

- Files are not committed to version control, OR
- Team members all use UTF-8 encoding consistently
- Files are not served directly via CDN

## Questions?

Contact the development team if you need help renaming files or have questions about specific use cases.
