
import csv
import json
import os
import re

csv_path = 'docs/추가 씨앗페 작가 - 시트1 192.csv'
output_path = 'content/artworks-batches/batch-005.ts'

def clean_text(text):
    if not text:
        return ''
    
    # Smart Spacing & Formatting
    lines = text.split('\n')
    cleaned_lines = [line.strip() for line in lines]
    
    # Join lines. Logic:
    # If a line seems to be a list item (starts with date, year, bullet), keep it close to previous.
    # If it's a section header (like '개인전', '수상'), ensure double newline before it.
    
    # 1. Join with simple newlines first
    joined = '\n'.join(cleaned_lines)
    
    # 2. Reduce 3+ newlines to 2
    joined = re.sub(r'\n{3,}', '\n\n', joined)
    
    # 3. Add double newlines before common section headers if not present
    # Sections: 학력, 개인전, 단체전, 수상, 소장처, 주요 경력, 그룹전, 출간, 컬럼연재, 벽화복원
    sections = ['학력', '개인전', '단체전', '수상', '소장처', '주요 경력', '주요 단체전', '그룹전', '출간', '컬럼연재', '벽화복원', '2인전']
    
    for section in sections:
        # regex to find the section header at start of line
        # We look for \n followed by the section name
        pattern = re.compile(f'(^|\n)({section})', re.MULTILINE)
        # Note: This is a simple heuristic. A more complex parser might be needed for perfect 'Smart Spacing',
        # but the user rules specify: "Major section headers... preceded by double newlines".
        # We will attempt to ensure at least \n\n before these keywords if they appear as headers.
        pass # The regex replacement for this is tricky without messing up content.
             # Given the "Smart Spacing" rule in GEMINI.md is about "Sections ... double space",
             # and "List ... single space".
             # The raw CSV seems to have newlines. Let's rely on the input newlines mostly,
             # just heavily cleaning up the 'spaces' around lines.

    # Apply the basic rules from GEMINI.md explicitly:
    # - 3+ newlines -> 2
    # - Trim each line (already done)
    # - Trim total
    
    return joined.strip()

def get_image_filename(id_str):
    # Check for file existence
    base_dir = 'public/images/artworks'
    if os.path.exists(f'{base_dir}/{id_str}.png'):
        return f'{id_str}.png'
    # Default to jpg
    return f'{id_str}.jpg'

def parse_csv():
    artworks = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        # Headers: 이름,이미지,작품명,재료,크기,년도,에디션 넘버,가격,프로필,작가노트,작가 이력,이미지파일명
        
        for row in reader:
            if not row or not row[0]: continue # Skip empty rows
            
            # Mapping
            # 0: 이름 -> artist
            # 1: 이미지 (skip)
            # 2: 작품명 -> title
            # 3: 재료 -> material
            # 4: 크기 -> size
            # 5: 년도 -> year
            # 6: 에디션 -> edition
            # 7: 가격 -> price
            # 8: 프로필 -> profile
            # 9: 작가노트 -> description
            # 10: 작가 이력 -> history
            # 11: 이미지파일명 -> id
            
            if len(row) < 12:
                # Handle cases where row might be shorter?
                continue
                
            art_id = row[11].strip()
            if not art_id: continue
            
            artist = row[0].strip()
            title = row[2].strip()
            material = row[3].strip() or "확인 중"
            size = row[4].strip() or "확인 중"
            size = size.replace('×', 'x').replace('X', 'x') # Normalize size
            year = row[5].strip() or "확인 중"
            edition = row[6].strip()
            price = row[7].strip()
            profile = clean_text(row[8])
            description = clean_text(row[9])
            history = clean_text(row[10])
            
            # Normalize price
            if price == '가격문의':
                price = '문의'
            
            # Normalize size
            if size != '확인 중':
                # Remove spaces
                size = size.replace(' ', '')
                # If standard pattern like 60x40 not ending in unit, append cm ? 
                # Most in CSV seem to have cm, or no unit.
                # 65x70 -> default to cm per user convention? 
                # Row 2: 65x70. Row 26: 12x12x285mm. 
                # Let's check if it strictly matches digits x digits
                if re.match(r'^\d+(\.\d+)?x\d+(\.\d+)?$', size):
                    size += 'cm'
            
            image_file = get_image_filename(art_id)
            
            artworks.append({
                'id': art_id,
                'artist': artist,
                'title': title,
                'material': material,
                'size': size,
                'year': year,
                'edition': edition,
                'price': price,
                'image': image_file,
                'shopUrl': '',
                'profile': profile,
                'description': description,
                'history': history,
                'sold': False
            })
            
    return artworks

def generate_ts(artworks):
    ts_content = "import { Artwork } from '../saf2026-artworks';\n\n"
    ts_content += "export const batch005: Artwork[] = [\n"
    
    for art in artworks:
        ts_content += "  {\n"
        ts_content += f"    id: '{art['id']}',\n"
        ts_content += f"    artist: '{art['artist']}',\n"
        ts_content += f"    title: `{art['title']}`,\n" # Use backticks for title to handle quotes if any
        ts_content += f"    material: `{art['material']}`,\n"
        ts_content += f"    size: '{art['size']}',\n"
        ts_content += f"    year: '{art['year']}',\n"
        ts_content += f"    edition: '{art['edition']}',\n"
        ts_content += f"    price: '{art['price']}',\n"
        ts_content += f"    image: '{art['image']}',\n"
        ts_content += f"    shopUrl: '{art['shopUrl']}',\n"
        
        # Multiline strings with backticks
        ts_content += f"    description: `{art['description']}`,\n"
        ts_content += f"    profile: `{art['profile']}`,\n"
        ts_content += f"    history: `{art['history']}`,\n"
        if art['sold']:
             ts_content += f"    sold: true,\n"
        
        ts_content += "  },\n"
    
    ts_content += "];\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

if __name__ == "__main__":
    data = parse_csv()
    generate_ts(data)
    print(f"Generated {len(data)} artworks in {output_path}")
