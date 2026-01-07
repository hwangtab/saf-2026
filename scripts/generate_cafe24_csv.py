
import csv
import io

source_file = '/Users/hwang-gyeongha/saf/docs/추가 씨앗페 작가 - 시트1.csv'
template_file = '/Users/hwang-gyeongha/saf/docs/cafe24-products-63-109.csv'
output_file = '/Users/hwang-gyeongha/saf/docs/cafe24-products-new.csv'

def clean_price(price_str):
    if not price_str:
        return ""
    return price_str.replace('₩', '').replace(',', '').strip()

def create_html(row):
    title = row['작품명']
    artist = row['이름']
    material = row['재료']
    size = row['크기']
    year = row['년도']
    desc = row['작가노트']
    history = row['작가 이력']
    
    html = f"<div><h2>{title}</h2><p>{artist}</p><p>{material} | {size} | {year}</p>"
    
    if desc:
        # Convert newlines to <br/> for proper HTML rendering
        formatted_desc = desc.replace('\n', '<br/>')
        html += f"<h3>작품 설명</h3><p>{formatted_desc}</p>"
        
    if history:
         formatted_history = history.replace('\n', '<br/>')
         html += f"<h3>작가 이력</h3><p>{formatted_history}</p>"
         
    html += "</div>"
    return html

def main():
    # Read Template Headers
    with open(template_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        # We need to map our data to these headers
        
    # Read Source Data
    with open(source_file, 'r', encoding='utf-8') as f:
        # Handle the BOM if present or just utf-8
        reader = csv.DictReader(f)
        source_data = list(reader)
        
    new_rows = []
    start_id = 110
    
    for row in source_data:
        # Skip empty rows if any
        if not row['이름']:
            continue
            
        current_id = start_id
        start_id += 1
        
        # Initialize a dict with empty strings for all headers
        new_row = {h: '' for h in headers}
        
        # Fill in the data
        # "상품코드","자체 상품코드","진열상태","판매상태","상품분류 번호","상품분류 신상품영역","상품분류 추천상품영역"
        new_row['자체 상품코드'] = f"SAF2026-{current_id}"
        new_row['진열상태'] = 'Y'
        new_row['판매상태'] = 'Y'
        new_row['상품분류 번호'] = '43'
        new_row['상품분류 신상품영역'] = 'Y'
        new_row['상품분류 추천상품영역'] = 'Y'
        
        # "상품명","영문 상품명","상품명(관리용)","공급사 상품명","모델명"
        new_row['상품명'] = f"{row['작품명']} - {row['이름']}"
        new_row['상품명(관리용)'] = f"[{current_id}] {row['이름']}"
        
        # "상품 요약설명","상품 간략설명","상품 상세설명"
        new_row['상품 요약설명'] = f"{row['재료']} | {row['크기']}"
        new_row['상품 상세설명'] = create_html(row)
        new_row['모바일 상품 상세설명 설정'] = 'A' # Use PC description? Template has 'A'
        
        # "검색어설정","과세구분"
        new_row['검색어설정'] = f"{row['이름']},씨앗페,SAF2026,미술,예술,작품"
        new_row['과세구분'] = 'B' # Tax Free
        
        # "소비자가","공급가","상품가","판매가"
        price = clean_price(row['가격'])
        new_row['소비자가'] = price
        new_row['공급가'] = price
        new_row['상품가'] = price
        new_row['판매가'] = price
        
        # "판매가 대체문구 사용","판매가 대체문구","주문수량 제한 기준","최소 주문수량(이상)","최대 주문수량(이하)","적립금","적립금 구분"
        new_row['판매가 대체문구 사용'] = 'N'
        new_row['주문수량 제한 기준'] = '1' # Template default? 
        # Check template row 3: "1","1" for min/max? No, "1","1" is indices 26, 27?
        # Headers: 25: 주문수량 제한 기준, 26: 최소..., 27: 최대...
        # Template line 3: ...,"N","","","1","1","","","","N",... 
        # So "주문수량 제한 기준" is empty, Min is 1, Max is 1? Or Min 1 Max empty?
        # Let's check the template content carefully specifically for these columns.
        # Template: "N","","","1","1","","","","N",
        # Indices:
        # 23: 판매가 대체문구 사용 (N)
        # 24: 판매가 대체문구 ("")
        # 25: 주문수량 제한 기준 ("") - Actually wait, let's look at a filled row.
        # Row 3: "N","","","1","1"
        # 23: N
        # 24: ""
        # 25: "" -> This seems to be "주문수량 제한 기준"
        # 26: 1 -> "최소 주문수량"
        # 27: 1 -> "최대 주문수량"
        
        new_row['최소 주문수량(이상)'] = '1'
        new_row['최대 주문수량(이하)'] = '1'
        
        
        # "성인인증","옵션사용","품목 구성방식","옵션 표시방식","옵션세트명","옵션입력","옵션 스타일","버튼이미지 설정","색상 설정","필수여부","품절표시 문구"
        new_row['성인인증'] = 'N'
        new_row['옵션사용'] = 'N'
        new_row['품절표시 문구'] = '품절'
        
        # "추가입력옵션","추가입력옵션 명칭","추가입력옵션 선택/필수여부","입력글자수(자)"
        # "이미지등록(상세)","이미지등록(목록)","이미지등록(작은목록)","이미지등록(축소)","이미지등록(추가)"
        img_filename = row['이미지파일명'].strip()
        if img_filename:
            full_img_name = f"{img_filename}.jpg"
            new_row['이미지등록(상세)'] = full_img_name
            new_row['이미지등록(목록)'] = full_img_name
            new_row['이미지등록(작은목록)'] = full_img_name
            new_row['이미지등록(축소)'] = full_img_name
            
        # "제조사","공급사","브랜드","트렌드","자체분류 코드","제조일자","출시일자","유효기간 사용여부","유효기간","원산지"
        # Template: mostly empty, "N" for valid date usage
        new_row['유효기간 사용여부'] = 'N'
        
        # "상품부피(cm)","상품결제안내","상품배송안내","교환/반품안내","서비스문의/안내","배송정보","배송방법","국내/해외배송","배송지역","배송비 선결제 설정","배송기간","배송비 구분","배송비입력","스토어픽업 설정","상품 전체중량(kg)","HS코드","상품 구분(해외통관)","상품소재","영문 상품소재(해외통관)","옷감(해외통관)","검색엔진최적화(SEO) 검색엔진 노출 설정","검색엔진최적화(SEO) Title","검색엔진최적화(SEO) Author","검색엔진최적화(SEO) Description","검색엔진최적화(SEO) Keywords","검색엔진최적화(SEO) 상품 이미지 Alt 텍스트","개별결제수단설정","상품배송유형 코드","메모"
        
        # Add to list
        new_rows.append(new_row)

    # Write Output
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(new_rows)
        
    print(f"Successfully created {output_file} with {len(new_rows)} products.")

if __name__ == "__main__":
    main()
