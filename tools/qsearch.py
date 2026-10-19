import re, sys
sys.path.insert(0, '/Users/muhammadsyamsurrijal/qiraat-table/tools')
from build_data import load_quran
ayat = load_quran()
pat = re.compile(sys.argv[1]); scope = set(map(int, sys.argv[2].split(','))) if len(sys.argv) > 2 and sys.argv[2] else None
hits = [(s, a, w, r) for (s, a), ws in ayat.items() if not scope or s in scope for w, r in ws if pat.search(r)]
from collections import Counter
print(len(hits), 'hits', dict(Counter(r for *_, r in hits)))
for s, a, w, r in hits[:int(sys.argv[3]) if len(sys.argv) > 3 else 60]: print(f'{s}:{a} {w} [{r}]')
