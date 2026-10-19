"""Print the an-Nashr farsh text between two headings: python3 tools/nashr_section.py 'سُورَةُ آلِ عِمْرَانَ' 'سُورَةُ النِّسَاءِ'"""
import json, sys
from pathlib import Path
rows = [json.loads(l) for l in (Path(__file__).resolve().parent.parent / "sources" / "nashr-farsh.jsonl").open(encoding="utf8")]
start, end = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None
on = False
for d in rows:
    out = []
    for line in d["text"].split("\n"):
        if not on and line.strip().startswith(start):
            on = True
        elif on and end and line.strip().startswith(end):
            on = None
            break
        if on:
            out.append(line)
    if out:
        print(f"\n[{d['vol']}/{d['page']}]")
        print("\n".join(out))
    if on is None:
        break
