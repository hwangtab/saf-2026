
import re

# Range of IDs to update
start_id = 110
end_id = 144
start_url_num = 198

ts_file = 'content/saf2026-artworks.ts'

with open(ts_file, 'r', encoding='utf-8') as f:
    content = f.read()

for i in range(start_id, end_id + 1):
    artwork_id = str(i)
    url_num = start_url_num + (i - start_id)
    url = f"https://koreasmartcoop.cafe24.com/surl/O/{url_num}"
    
    # Regex to find the object block for this ID
    # We look for "id: '110'," then capture content until we see a line starting with "shopUrl:" or "history:" or just the end of block?
    # Simpler approach: Find the id line, then look for "image: '...'," and append/replace shopUrl after it.
    
    # Pattern to find the block for a specific ID
    # Assuming standard formatting: id: '123',
    
    pattern_id = re.compile(f"id: '{artwork_id}',")
    
    if not pattern_id.search(content):
        print(f"Warning: ID {artwork_id} not found.")
        continue
        
    # Find the image line within this object (heuristic: closest image line after ID)
    # We need to be careful not to match image line of NEXT object.
    # We can split by "id: '" to isolate blocks? 
    # Or just use a specific regex that matches id -> ... -> image line
    
    # Let's try replacing existing shopUrl first
    # Search for id: '110' ... shopUrl: '...' 
    # This involves matching across lines
    
    # Specific regex for this file's structure
    # Matches: id: '110', (anything non-greedy) image: '...',
    object_pattern = re.compile(f"(id: '{artwork_id}',.*?image: '.*?')(,?)(\n)", re.DOTALL)
    
    # Check if shopUrl already exists immediately after
    # We can perform a robust replacement by verifying if shopUrl follows.
    
    # Better strategy: 
    # 1. Find the start of the object for this ID.
    # 2. Find the end of this object (closing brace `  },`)
    # 3. Inside this chunk, check for shopUrl.
    # 4. If exists, update it. If not, add it after image.
    
    # Split content by logical object separators if possible, but that's hard with regex.
    # Let's iterate using finditer on the ID.
    
    match = pattern_id.search(content)
    if match:
        start_idx = match.start()
        # Find next "id: '" or end of file to limit scope
        next_match = re.search(r"id: '\d+',", content[start_idx + 1:])
        end_idx = (start_idx + 1 + next_match.start()) if next_match else len(content)
        
        block = content[start_idx:end_idx]
        
        new_block = block
        if "shopUrl:" in block:
            # Replace existing url
            new_block = re.sub(r"shopUrl: '.*?'", f"shopUrl: '{url}'", new_block)
        else:
            # Insert after image: '...'
            # Find image line
            img_match = re.search(r"(image: '.*?')(,?)(\n)", new_block)
            if img_match:
                # inserting shopUrl
                # content: image: '...'(,)\n
                # replace with image: '...',\n    shopUrl: 'URL',\n
                
                # Careful with commas. 
                # If comma exists, keep it. 
                # We want: image: '...', \n    shopUrl: '...',
                
                part1 = img_match.group(1) # image: '...'
                part2 = img_match.group(2) # comma if any
                part3 = img_match.group(3) # newline
                
                if not part2:
                    part2 = ',' # Ensure comma exists on image line if we add a line after
                
                replacement = f"{part1}{part2}{part3}    shopUrl: '{url}',{part3}"
                new_block = new_block.replace(img_match.group(0), replacement)
        
        # Replace the block in content
        # To avoid index shifting issues if we modify content in loop... 
        # Actually doing this in loop on 'content' string is tricky because indices change.
        # But wait, replace() replaces ALL occurrences which is bad if block is not unique?
        # Block is likely unique enough due to id.
        
        content = content.replace(block, new_block)

with open(ts_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete.")
