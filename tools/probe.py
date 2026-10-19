import json, sys
sys.path.insert(0, '/Users/muhammadsyamsurrijal/qiraat-table/tools')
from build_data import load_quran, word_matches
ayat = load_quran()
conds = json.load(open(sys.argv[1], encoding='utf8'))
for name, c in conds.items():
    hits = [(s, a, ws[i][0]) for (s, a), ws in ayat.items() for i in range(len(ws)) if word_matches(c, ws, i)]
    show = c.get('_show', 12)
    print(f'## {name}: {len(hits)}  ' + ' | '.join(f'{s}:{a} {w}' for s, a, w in hits[:show]))
