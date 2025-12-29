#!/bin/bash

# 이미지 압축 스크립트
# 1MB 이상의 이미지를 최적화합니다

cd "$(dirname "$0")/../public/images/artworks"

echo "=== 이미지 압축 시작 ==="

# 1. PNG를 JPEG로 변환 (11.png, 39.png, 43.png)
for file in 11.png 39.png 43.png; do
    if [ -f "$file" ]; then
        base="${file%.png}"
        echo "변환 중: $file -> ${base}.jpg"
        
        # PNG를 JPEG로 변환 (품질 85%)
        sips -s format jpeg -s formatOptions 85 "$file" --out "${base}.jpg"
        
        # 원본 PNG 삭제
        rm "$file"
        
        echo "  완료: $(ls -lh ${base}.jpg | awk '{print $5}')"
    fi
done

# 2. 큰 JPEG 파일 재압축 (33.jpg)
if [ -f "33.jpg" ]; then
    echo "재압축 중: 33.jpg"
    # 임시 파일로 압축
    sips -s formatOptions 80 "33.jpg" --out "33_temp.jpg"
    mv "33_temp.jpg" "33.jpg"
    echo "  완료: $(ls -lh 33.jpg | awk '{print $5}')"
fi

echo ""
echo "=== 압축 결과 ==="
ls -lh 11.jpg 33.jpg 39.jpg 43.jpg 2>/dev/null || echo "파일 확인 필요"

echo ""
echo "=== 1MB 초과 파일 확인 ==="
find . -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) -size +1M -exec ls -lh {} \;
