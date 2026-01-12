import csv
import json

# Read CSV
with open('docs/추가 씨앗페 작가 - 시트 167-.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    headers = next(reader)
    rows = list(reader)

# Extract unique artists with profiles
artists_profiles = {}
for row in rows:
    if len(row) < 9:
        continue
    artist = row[0].strip()
    profile = row[8].strip()
    
    if artist and profile and artist not in artists_profiles:
        # Clean up profile text
        profile = profile.replace('\r', '')
        # Remove excessive newlines (3+ -> 2)
        while '\n\n\n' in profile:
            profile = profile.replace('\n\n\n', '\n\n')
        # Trim each line
        profile = '\n'.join(line.strip() for line in profile.split('\n'))
        profile = profile.strip()
        
        artists_profiles[artist] = profile

# Output as JSON
print(json.dumps(artists_profiles, ensure_ascii=False, indent=2))
