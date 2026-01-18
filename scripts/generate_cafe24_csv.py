
import csv
import io

# Input/Output filenames
INPUT_CSV = "docs/추가 씨앗페 작가 - 시트 167-.csv"
TEMPLATE_CSV = "docs/cafe24-products-new.csv"
OUTPUT_CSV = "docs/cafe24-products-batch-004.csv"

# Start ID
START_ID = 167

def clean_price(price_str):
    if not price_str:
        return "0"
    return price_str.replace("₩", "").replace(",", "").replace('"', '').strip()

def create_product_html(title, artist, material, size, year, profile, history):
    # Sanitize inputs
    profile = profile.replace('"', '&quot;') if profile else ""
    history = history.replace('"', '&quot;') if history else ""
    title = title.replace('"', '&quot;')
    artist = artist.replace('"', '&quot;')
    
    html = f"""<div style="font-family: 'Noto Sans KR', sans-serif; line-height: 1.8; color: #333;"><div style="margin-bottom: 30px;"><h2 style="font-size: 24px; margin-bottom: 10px;">{title}</h2><p style="font-size: 18px; color: #666; margin-bottom: 5px;">{artist}</p><p style="color: #888;">{material} | {size} | {year}</p></div><div style="margin-bottom: 30px;"><h3 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">작가 소개</h3><p style="white-space: pre-line;">{profile}</p></div><div style="margin-bottom: 30px;"><h3 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">작가 이력</h3><p style="white-space: pre-line; font-size: 14px;">{history}</p></div></div>"""
    
    return html

# Read header from template to get field names
with open(TEMPLATE_CSV, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    fieldnames = next(reader)

# Prepare output file
with open(OUTPUT_CSV, 'w', encoding='utf-8-sig', newline='') as f_out:
    writer = csv.DictWriter(f_out, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
    writer.writeheader()
    
    # Read input data
    with open(INPUT_CSV, 'r', encoding='utf-8') as f_in:
        reader = csv.reader(f_in)
        next(reader) # Skip header
        
        current_id = START_ID
        
        for row in reader:
            if len(row) < 5: continue
            
            # Map columns from source CSV
            artist = row[0].strip()
            title = row[2].strip()
            material = row[3].strip()
            size = row[4].strip()
            year = row[5].strip()
            price_raw = row[7].strip()
            profile = row[8].strip() if len(row) > 8 else ""
            history = row[10].strip() if len(row) > 10 else ""
            
            price = clean_price(price_raw)
            
            # Image handling
            image_ext = "png" if current_id == 173 else "jpg"
            image_filename = f"{current_id}.{image_ext}"
            
            # Create a dictionary for the row, initialized with empty strings for all fields
            # DictWriter fills missing fields with restval (default empty if not set, 
            # but safer to explicitly set what we know and let others be empty/none)
            # Actually better to create a dict with known keys.
            
            row_data = {field: "" for field in fieldnames}
            
            # Populate fields corresponding to the template logic
            row_data["자체 상품코드"] = f"SAF2026-{current_id}"
            row_data["진열상태"] = "Y"
            row_data["판매상태"] = "Y"
            row_data["상품분류 번호"] = "43"
            row_data["상품분류 신상품영역"] = "Y"
            row_data["상품분류 추천상품영역"] = "Y"
            row_data["상품명"] = f"{title} - {artist}"
            row_data["상품명(관리용)"] = f"[{current_id}] {artist}"
            row_data["상품 요약설명"] = f"{material} | {size}"
            row_data["상품 상세설명"] = create_product_html(title, artist, material, size, year, profile, history)
            row_data["모바일 상품 상세설명 설정"] = "A"
            row_data["검색어설정"] = f"{artist},씨앗페,SAF2026,미술,예술,작품"
            row_data["과세구분"] = "B"
            row_data["소비자가"] = price
            row_data["공급가"] = price
            row_data["상품가"] = price
            row_data["판매가"] = price
            row_data["판매가 대체문구 사용"] = "N"
            row_data["최소 주문수량(이상)"] = "1"
            row_data["최대 주문수량(이하)"] = "1"
            row_data["성인인증"] = "N"
            row_data["옵션사용"] = "N"
            row_data["필수여부"] = "N" # Assuming this maps to something logical or was present in my previous attempt? 
            # In previous attempt index 40 was set to "N". Index 40 is "필수여부". Correct.
            
            row_data["품절표시 문구"] = "품절"
            row_data["유효기간 사용여부"] = "N"
            
            row_data["이미지등록(상세)"] = image_filename
            row_data["이미지등록(목록)"] = image_filename
            row_data["이미지등록(작은목록)"] = image_filename
            row_data["이미지등록(축소)"] = image_filename
            
            # "상품 구분(해외통관)" is index 77.
            # I previously put "N" in index 73 ("배송비입력"). 
            # I will Leave "배송비입력" empty.
            # I will leave "유효기간 사용여부" empty (as initialized).
            
            writer.writerow(row_data)
            
            print(f"ID: {current_id} | Artist: {artist} | Title: {title}")
            current_id += 1

print(f"Generated {OUTPUT_CSV} with {current_id - START_ID} items.")
