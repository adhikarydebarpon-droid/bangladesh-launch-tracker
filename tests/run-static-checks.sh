#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
from html.parser import HTMLParser
import json, re
root=Path('.')
html=(root/'index.html').read_text(encoding='utf-8')
class P(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
p=P();p.feed(html)
assert len(p.ids)==len(set(p.ids)), 'duplicate HTML id found'
assert 'বাংলাদেশের প্রথম তথ্যবহুল নৌপথের অ্যাপ' in html
assert '<title>Bangladesh Launch Tracker</title>' in html
assert '<span class="pill">V1</span>' not in html
assert 'Bangladesh Launch Tracker V1' not in html
assert 'DEMO-ADMIN-2026' not in html and 'demoAdminLogin' not in html
assert 'JocEPSTwOYXA4FvhYnf0xox7Lce2' in html and 'adhikarydebarpon@gmail.com' in html
assert 'gpsLocks/' in html and 'runTransaction' in html
assert 'nearbyRadius' in html and 'haversine' in html
assert 'publicData' not in html[html.find('async function syncFromFirebase'):html.find('/* ---------------------------\n   25.')]
for f in ['firebase/database.rules.json','firebase.json','manifest.webmanifest','functions/package.json','package.json','.firebaserc']:
    json.loads((root/f).read_text(encoding='utf-8'))
assert (root/'functions/index.js').exists()
assert (root/'sw.js').exists()
print(f'HTML IDs: {len(p.ids)} unique')
print('JSON files: valid')
print('Branding/Admin/GPS/Nearby static assertions: passed')
PY
python3 - <<'PY'
from pathlib import Path
import re
s=Path('index.html').read_text()
m=re.findall(r'<script type="module">(.*?)</script>',s,re.S)
assert len(m)==1
Path('/tmp/blt-v1-module.mjs').write_text(m[0])
PY
node --check /tmp/blt-v1-module.mjs
node --check functions/index.js
printf 'Application and Cloud Functions JavaScript syntax: passed\n'
printf 'All static checks passed.\n'
node --test tests/*.test.mjs
